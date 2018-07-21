import assert from 'assert';
import rosmaro, {initialValueLens} from '../index';
import {mergeArrows, transparentSingleChildHandler} from '../testUtils';
import union from 'lodash/union';
import without from 'lodash/without';
import {isEmpty, lens as Rlens, map, prop, head, concat, values} from 'ramda';

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

const testSession = ({model, steps}) => {
  steps.reduce((state, {call, expect = {}}) => {
    const callRes = model({state, action: call});
    if (expect.result) assert.deepEqual(callRes.result, expect.result);
    return callRes.state;
  }, undefined);
}

const expectedRes = {A: 'OrthogonalARes', B: 'OrthogonalBRes'};

const arrowFollowingHandler = (expectedActionType, arrowToFollow) => ({action, node}) => ({
  arrows: action.type === expectedActionType ? [[[node.id, arrowToFollow]]] : []
});

describe('rosmaro', () => {

  it ('sets the initial context to undefined', () => {
    const graph = {
      'main': {type: 'leaf'}
    };
    const bindings = {
      'main': {
        handler: ({action, context, node}) => {
          return {
            result: {gotContext: context},
            context,
            arrows: [[[node.id, undefined]]]
          };
        }
      }
    };
    const model = rosmaro({
      graph,
      bindings,
    });
    expect(model({}).result).toEqual({gotContext: undefined});
  });

  describe('a dynamic composite', () => {

    it('alters the graphs based on the context', () => {

      const graph = {
        'main': {
          type: 'dynamicComposite',
          child: 'leaf'
        },
        'leaf': {type: 'leaf'}
      };

      const bindings = {
        'main': {
          lens: () => initialValueLens({elems: ['A', 'B']}),
          nodes: ({context: {elems}}) => elems,
          handler: ({action, context, children}) => {
            const allResults = map(child => child({action}), children);
            return {
              context: head(values(allResults)).context,
              arrows: concat(...map(prop('arrows'), values(allResults))),
              result: map(prop('result'), allResults)
            }
          }
        },
        'main:child': {
          handler: ({action, context, node}) => {
            return {
              context,
              arrows: [[[null, undefined]]],
              result: (action.type === 'SAY_HI') 
                ? `I'm ${node.id}.` 
                : undefined
            };
          }
        }
      };

      const model = rosmaro({graph, bindings});

      assert.deepEqual(
        model({
          state: undefined,
          action: {type: 'SAY_HI'},
        }).result,
        {A: "I'm main:A.", B: "I'm main:B."}
      );

    });

    it('forgets the state of dynamically removed graphs', () => {

      const graph = {
        "main": {
          "type": "dynamicComposite",
          "child": "Switch"
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

      const makeSwitchHandler = name => ({action, context, node}) => {
        switch (action.type) {
          case 'READ':
            return {
              arrows: [[[node.id, undefined]]],
              result: name,
              context: context,
            }
            break;
          case 'TOGGLE':
            return {
              arrows: [[[node.id, 'toggle']]],
              context: context,
            };
            break;

        }
      };
      
      const bindings = {
        'main': {
          lens: () => initialValueLens({switches: [1, 2]}),
          nodes: ({context}) => context.switches,
          handler: ({action, context, children, node}) => {
            switch (action.type) {
              case 'ADD_SWITCH':
                return {
                  arrows: [[[node.id, undefined]]],
                  context: {switches: union(context.switches, [action.number])}
                };
                break;
              case 'REMOVE_SWITCH':
                return {
                  arrows: [[[node.id, undefined]]],
                  context: {switches: without(context.switches, action.number)}
                };
                break;
            }

            const allResults = map(child => child({action}), children);
            return {
              context: context,
              arrows: mergeArrows(values(map(prop('arrows'), allResults))),
              result: map(prop('result'), allResults)
            }
          }
        },
        'main:child': {
          lens: () => initialValueLens({switches: [1, 2]}),
          nodes: ({context}) => context.switches,
          handler: transparentSingleChildHandler,
        },
        'main:child:On': {handler: makeSwitchHandler('On')},
        'main:child:Off': {handler: makeSwitchHandler('Off')},
      };

      const model = rosmaro({
        graph,
        bindings
      });

      testSession({model, steps: [
        {
          call: {type: 'READ'},
          expect: {result: {1: 'Off', 2: 'Off'}},
        },
        {
          call: {type: 'TOGGLE'},
        },
        {
          call: {type: 'READ'},
          expect: {result: {1: 'On', 2: 'On'}},
        },
        {
          call: {type: 'ADD_SWITCH', number: 3},
        },
        {
          call: {type: 'READ'},
          expect: {result: {1: 'On', 2: 'On', 3: 'Off'}},
        },
        {
          call: {type: 'REMOVE_SWITCH', number: 2},
        },
        {
          call: {type: 'READ'},
          expect: {result: {1: 'On', 3: 'Off'}},
        },
        {
          call: {type: 'ADD_SWITCH', number: 2},
        },
        {
          call: {type: 'READ'},
          expect: {result: {1: 'On', 2: 'Off', 3: 'Off'}},
        },
        {
          call: {type: 'TOGGLE'},
        },
        {
          call: {type: 'READ'},
          expect: {result: {1: 'Off', 2: 'On', 3: 'On'}},
        },
      ]});

    });

  });

  describe('external model', () => {

    const subModel = {
      graph: {
        "main": {
          "type": "graph",
          "nodes": {
            "A": "A",
            "B": "B"
          },
          "arrows": {
            "A": {
              "x": {
                "target": "B",
                "entryPoint": "start"
              }
            }
          },
          "entryPoints": {
            "start": {
              "target": "A",
              "entryPoint": "start"
            }
          }
        },
        "A": {
          "type": "leaf"
        },
        "B": {
          "type": "leaf"
        }
      },
      bindings: {
        'main': {
          handler: transparentSingleChildHandler,
        },
        'main:A': {
          handler: ({action, node, context}) => {
            return arrowFollowingHandler('FOLLOW_ARROW', 'x')({action, node, context});
          }
        },
        'main:B': {
          handler: ({action, node, context}) => {
            return arrowFollowingHandler('FOLLOW_ARROW', 'x')({action, node, context});
          }
        }
      }
    };

    const mainModel = {
      graph: {
        "main": {
          "type": "graph",
          "nodes": {
            "A": "A",
            "B": "B"
          },
          "arrows": {
            "A": {
              "x": {
                "target": "B",
                "entryPoint": "start"
              }
            }
          },
          "entryPoints": {
            "start": {
              "target": "A",
              "entryPoint": "start"
            }
          }
        },
        "A": {
          "type": "external"
        },
        "B": {
          "type": "leaf"
        }
      },
      bindings: {
        'main': {
          handler: transparentSingleChildHandler,
        },
        'main:A': subModel,
        'main:B': {
          handler: ({action, context, node}) => {
            switch (action.type) {
              case 'COMPLETED':
                return {
                  arrows: [[[node.id, undefined]]],
                  result: true,
                  context,
                };
              break;
            }
          }
        }
      }
    };

    testSession({model: rosmaro(mainModel), steps: [
      // Going from main:A:A to main:A:B
      {
        call: {type: 'FOLLOW_ARROW'},
        expect: {result: undefined},
      },
      // Going from main:A:B to main:B
      {
        call: {type: 'FOLLOW_ARROW'},
        expect: {result: undefined},
      },
      // At main:B
      {
        call: {type: 'COMPLETED'},
        expect: {result: true},
      },
    ]});

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

    const bindings = {
      'main': {
        handler: transparentSingleChildHandler,
      },
      'main:A': {
        handler: ({action, context, node}) => {
          const arrow = action.type == 'FOLLOW_ARROW' ? action.which : undefined;
          return {
            context,
            arrows: [[[node.id, arrow]]]
          };
        }
      },
      'main:B': {
        handler: ({action, context, node}) => {
          return {
            result: action.type == 'READ_NODE' ? 'B' : undefined,
            context,
            arrows: [[[node.id, undefined]]]
          };
        }
      }
    };

    const model = rosmaro({
      graph,
      bindings,
    });

    testSession({model, steps: [
      {
        call: {type: 'FOLLOW_ARROW', which: 'x'},
        expect: {result: undefined},
      },
      {
        call: {type: 'READ_NODE'},
        expect: {result: 'B'},
      },
      {
        call: {type: 'NON-EXISTENT'},
        expect: {result: undefined},
      },
    ]});

  });

});