import assert from 'assert';
import rosmaro from '../index';
import union from 'lodash/union';
import without from 'lodash/without';
import {isEmpty, lens as Rlens} from 'ramda';

let logEntries = [];
let lock, storage;
const log = entry => logEntries.push(entry);

const graph = {

  'main': {
    type: 'graph',
    nodes: {'A': 'Graph', 'B': 'GraphTarget'},
    arrows: {
      'A': {
        'y': {target: 'B', entryPoint: 'start'}
      }
    },
    entryPoints: {start: {target: 'A', entryPoint: 'start'}}
  },

  'Graph': {
    type: 'graph',
    nodes: {'A': 'Composite', 'B': 'CompositeTarget'},
    arrows: {
      'A': {
        'x': {target: 'B', entryPoint: 'start'}
      }
    },
    entryPoints: {start: {target: 'A', entryPoint: 'start'}}
  },

  'Composite': {
    type: 'composite',
    nodes: {'A': 'OrthogonalA', 'B': 'OrthogonalB'}
  },

  'OrthogonalA': {type: 'leaf'},

  'OrthogonalB': {type: 'leaf'},

  'CompositeTarget': {type: 'leaf'},

  'GraphTarget': {type: 'leaf'}

};

// TODO: this could be separated into it's own package
const initCtxLens = initCtx => Rlens(
  ctx => isEmpty(ctx) ? initCtx : ctx,
  (returned, src) => returned,
);

const testSession = ({model, steps}) => {
  steps.reduce((state, {call, expect = {}}) => {
    const callRes = model({state, action: call});
    if (expect.res) assert.deepEqual(callRes.res, expect.res);
    return callRes.state;
  }, undefined);
}

const expectedRes = {A: 'OrthogonalARes', B: 'OrthogonalBRes'};

const loggingHandler = (nodeName, res) => ({
  afterMethod({res}) {
    log(nodeName);
    return res;
  },
  ...(res ? {method: () => {
    return res;
  }} : {})
});

describe('rosmaro', () => {

  beforeEach(() => {
    logEntries = [];
  });

  const mainHandler = loggingHandler('main');
  const OrthogonalAHandler = loggingHandler('OrthogonalA', {
    res: 'OrthogonalARes',
    arrow: 'y',
    ctx: {fromA: 123}
  });  
  const OrthogonalBHandler = loggingHandler('OrthogonalB', {
    res: 'OrthogonalBRes',
    arrow: 'x',
    ctx: {fromB: 456}
  });
  const CompositeHandler = loggingHandler('Composite');
  const GraphHandler = loggingHandler('Graph');
  const CompositeTargetHandler = loggingHandler('CompositeTarget', {ctx: {}});
  const GraphTargetHandler = loggingHandler('GraphTarget', {ctx: {}});
  const syncHandlers = {
    'main': mainHandler,
    'OrthogonalA': OrthogonalAHandler,
    'OrthogonalB': OrthogonalBHandler,
    'Composite': CompositeHandler,
    'Graph': GraphHandler,
    'CompositeTarget': CompositeTargetHandler,
    'GraphTarget': GraphTargetHandler
  };

  describe('a dynamic composite', () => {

    it('alters the graphs based on the context', () => {

      const graph = {
        'main': {
          type: 'dynamicComposite',
          nodeTemplate: 'leaf'
        },
        'leaf': {type: 'leaf'}
      };

      const handlers = {
        'main': {
          lens: () => initCtxLens({elems: ['A', 'B']}),
          nodes: ({ctx: {elems}}) => elems
        },
        'leaf': {
          handler: ({action, ctx, node}) => {
            return {
              ctx,
              arrows: [[[null, undefined]]],
              res: (action.type === 'SAY_HI') 
                ? `I'm ${node.ID}.` 
                : undefined
            };
          }
        }
      };

      const model = rosmaro({graph, handlers});

      assert.deepEqual(
        model({
          state: undefined,
          action: {type: 'SAY_HI'},
        }).res,
        {A: "I'm main:A.", B: "I'm main:B."}
      );

    });

    it('forgets the state of dynamically removed graphs', () => {

      const graph = {
        "main": {
          "type": "dynamicComposite",
          "nodeTemplate": "Switch"
        },
        "Switch": {
          "type": "graph",
          "nodes": {
            "Off": "Off",
            "On": "On"
          },
          "arrows": {
            "Off": {
              "toggle": {
                "target": "On",
                "entryPoint": "start"
              }
            },
            "On": {
              "toggle": {
                "target": "Off",
                "entryPoint": "start"
              }
            }
          },
          "entryPoints": {
            "start": {
              "target": "Off",
              "entryPoint": "start"
            }
          }
        },
        "Off": {
          "type": "leaf"
        },
        "On": {
          "type": "leaf"
        }
      };

      const makeSwitchHandler = name => ({action, ctx}) => {
        switch (action.type) {
          case 'READ':
            return {
              arrows: [[[null, undefined]]],
              res: name,
              ctx: ctx,
            }
            break;
          case 'TOGGLE':
            return {
              arrows: [[[null, 'toggle']]],
              ctx: ctx,
            };
            break;
          case 'ADD_SWITCH':
            return {
              arrows: [[[null, undefined]]],
              ctx: {switches: union(ctx.switches, [action.number])}
            };
            break;
          case 'REMOVE_SWITCH':
            return {
              arrows: [[[null, undefined]]],
              ctx: {switches: without(ctx.switches, action.number)}
            };
            break;
        }
      };
      
      const handlers = {
        main: {
          lens: () => initCtxLens({switches: [1, 2]}),
          nodes: ({ctx}) => ctx.switches,
        },
        On: {handler: makeSwitchHandler('On')},
        Off: {handler: makeSwitchHandler('Off')},
      };

      const model = rosmaro({
        graph,
        handlers
      });

      testSession({model, steps: [
        {
          call: {type: 'READ'},
          expect: {res: {1: 'Off', 2: 'Off'}},
        },
        {
          call: {type: 'TOGGLE'},
        },
        {
          call: {type: 'READ'},
          expect: {res: {1: 'On', 2: 'On'}},
        },
        {
          call: {type: 'ADD_SWITCH', number: 3},
        },
        {
          call: {type: 'READ'},
          expect: {res: {1: 'On', 2: 'On', 3: 'Off'}},
        },
        {
          call: {type: 'REMOVE_SWITCH', number: 2},
        },
        {
          call: {type: 'READ'},
          expect: {res: {1: 'On', 3: 'Off'}},
        },
        {
          call: {type: 'ADD_SWITCH', number: 2},
        },
        {
          call: {type: 'READ'},
          expect: {res: {1: 'On', 2: 'Off', 3: 'Off'}},
        },
        {
          call: {type: 'TOGGLE'},
        },
        {
          call: {type: 'READ'},
          expect: {res: {1: 'Off', 2: 'On', 3: 'On'}},
        },
      ]});

    });

  });

  it('supports a transition from A to B', () => {

    const graph = {
      'main': {
        type: 'graph',
        nodes: {A: 'A', B: 'B'},
        entryPoints: {start: {target: 'A', entryPoint: 'start'}},
        arrows: {
          'A': {x: {target: 'B', entryPoint: 'start'}}
        }
      },
      'A': {type: 'leaf'},
      'B': {type: 'leaf'},
    };

    const handlers = {
      'A': {
        handler: ({action, ctx}) => {
          const arrow = action.type == 'FOLLOW_ARROW' ? action.which : undefined;
          return {
            ctx,
            arrows: [[[null, arrow]]]
          };
        }
      },
      'B': {
        handler: ({action, ctx}) => {
          return {
            res: action.type == 'READ_NODE' ? 'B' : undefined,
            ctx,
            arrows: [[[null, undefined]]]
          };
        }
      }
    };

    const model = rosmaro({
      graph,
      handlers,
    });

    testSession({model, steps: [
      {
        call: {type: 'FOLLOW_ARROW', which: 'x'},
        expect: {res: undefined},
      },
      {
        call: {type: 'READ_NODE'},
        expect: {res: 'B'},
      },
      {
        call: {type: 'NON-EXISTENT'},
        expect: {res: undefined},
      },
    ]});

  });

});