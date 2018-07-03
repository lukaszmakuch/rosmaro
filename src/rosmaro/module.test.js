import assert from 'assert';
import rosmaro from '../index';
import union from 'lodash/union';
import without from 'lodash/without';

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

  xdescribe('with synchronous handlers', () => {

    it('is fully synchronous if everything is synchronous', () => {
      const model = rosmaro({
        graph,
        handlers: syncHandlers,
        storage: storage,
        lock: lock.fn
      });

      const aRes = model.method(1, 2);
      const bRes = model.method(3, 4);

      assert.deepEqual(expectedRes, aRes);
    });

  });

  xdescribe('a dynamic composite', () => {

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
          initCtx: {elems: ['A', 'B']},
          nodes: ({ctx: {elems}}) => elems
        },
        'leaf': {
          sayHi: ({nodeInfo}) => `I'm ${nodeInfo.ID}.`
        }
      };

      const model = rosmaro({
        graph,
        handlers,
        storage: storage,
        lock: lock.fn
      });

      assert.deepEqual(
        model.sayHi(),
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

      const switchTpl = {
        toggle: () => ({arrow: 'toggle'}),
        addSwitch: ({number, ctx}) => ({ctx: {switches: union(ctx.switches, [number])}}),
        removeSwitch: ({number, ctx}) => ({ctx: {switches: without(ctx.switches, number)}}),
      };
      
      const handlers = {
        main: {
          initCtx: {switches: [1, 2]},
          nodes: ({ctx}) => ctx.switches,
        },
        On: {'read': () => 'On', ...switchTpl},
        Off: {'read': () => 'Off', ...switchTpl},
      };

      const model = rosmaro({
        graph,
        handlers,
        storage: storage,
        lock: lock.fn
      });

      assert.deepEqual(
        model.read(),
        {1: 'Off', 2: 'Off'}
      );

      model.toggle();

      assert.deepEqual(
        model.read(),
        {1: 'On', 2: 'On'}
      );

      model.addSwitch({number: 3});

      assert.deepEqual(
        model.read(),
        {1: 'On', 2: 'On', 3: 'Off'}
      );

      model.removeSwitch({number: 2});

      assert.deepEqual(
        model.read(),
        {1: 'On', 3: 'Off'}
      );

      model.addSwitch({number: 2});

      assert.deepEqual(
        model.read(),
        {1: 'On', 2: 'Off', 3: 'Off'}
      );

      model.toggle();

      assert.deepEqual(
        model.read(),
        {1: 'Off', 2: 'On', 3: 'On'}
      );

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

    const {state: secondState, res: firstRes} = model({
      state: undefined, // this should create a blank, initial state
      action: {type: 'FOLLOW_ARROW', which: 'x'}
    });

    assert.deepEqual(undefined, firstRes);

    const {state: thirdState, res: secondRes} = model({
      state: secondState,
      action: {type: 'READ_NODE'}
    });

    assert.notDeepEqual(secondState, firstRes);
    assert.notDeepEqual('B', secondRes);

    assert.deepEqual(
      undefined,
      model({action: {type: 'NON-EXISTENT'}}).res
    );

  });

});