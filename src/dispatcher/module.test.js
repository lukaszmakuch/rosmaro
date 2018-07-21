import assert from 'assert';
import dispatch from './api';
import {identityLens} from './../utils/all';
import {
  transparentSingleChildHandler, 
  mergeArrows,
  addNodeToArrows,
  renameArrows,
} from './../handlerUtils';
import {identity as Ridentity, lens as Rlens, dissoc, prop, keys, lensPath as RlensPath, head, values, map} from 'ramda';

describe("dispatcher", () => {

  it("calls bound methods based on the FSM state", () => {
    const graph = {
      'main': {type: 'graph', nodes: ['main:A', 'main:B']},
      'main:A': {type: 'leaf'},
      'main:B': {type: 'graph', nodes: ['main:B:A', 'main:B:B']},
      'main:B:A': {type: 'leaf'},
      'main:B:B': {type: 'composite', nodes: ['main:B:B:A', 'main:B:B:B']},
      'main:B:B:A': {type: 'leaf'},
      'main:B:B:B': {type: 'leaf'}
    };

    const FSMState = {
      'main': 'main:B',
      'main:B': 'main:B:B'
    };

    const lenses = {
      'main': () => identityLens,
      'main:A': () => identityLens,
      'main:B': () => identityLens,
      'main:B:A': () => identityLens,
      'main:B:B': () => identityLens,
      'main:B:B:A': () => identityLens,
      'main:B:B:B': () => identityLens,
    };

    const handlers = {

      'main': transparentSingleChildHandler,

      'main:B': transparentSingleChildHandler,

      'main:B:B': ({action, context, children, node}) => {
        const allResults = map(child => child({action}), children);
        return {
          context: {...allResults.A.context, ...allResults.B.context},
          arrows: addNodeToArrows(node.id, mergeArrows(map(prop('arrows'), values(allResults)))),
          result: allResults.A.result + "_" + allResults.B.result,
        };
      },

      "main:B:B:A": ({action, context, node}) => {
        switch (action.type) {
          case 'FOLLOW_ARROWS': 
            return {arrows: [[[node.id, 'x']]], context, result: 'ARes'};
            break;
        }
      },

      "main:B:B:B": ({action, context, node}) => {
        switch (action.type) {
          case 'FOLLOW_ARROWS': 
            return {arrows: [[[node.id, 'y']]], context, result: 'BRes'};
            break;
        }
      }
    };

    const context = {
      a: 100, b: 200
    };

    const callRes = dispatch({
      graph,
      FSMState,
      handlers,
      context,
      action: {type: 'FOLLOW_ARROWS'},
      lenses
    });

    const expectedCallRes = {
      arrows: [
        [['main:B:B:A', 'x'], ['main:B:B', 'x'], ['main:B', 'x']],
        [['main:B:B:B', 'y'], ['main:B:B', 'y'], ['main:B', 'y']]
      ],
      context: {a: 100, b: 200},
      result: 'ARes_BRes'
    };

    assert.deepEqual(expectedCallRes, callRes);
  });

  describe('lenses', () => {

    it('composes lenses', () => {
      const context = {
        raw: {
          part: {
            val: 'initial'
          }
        }
      };
      const graph = {
        'main': {type: 'graph', nodes: ['main:level1']},
        'main:level1': {type: 'composite', nodes: ['main:level1:level2']},
        'main:level1:level2': {type: 'leaf'}
      };
      const FSMState = {
        'main': 'main:level1'
      };
      const handlers = {
        'main': transparentSingleChildHandler,
        'main:level1': transparentSingleChildHandler,
        'main:level1:level2': ({context, node}) => {
          return {
            result: {gotContext: context},
            context: {val: 'changed'},
            arrows: [[[node.id, 'x']]]
          };
        },
      };
      const lenses = {
        // simple map {raw} => {forMain}
        'main': () => Rlens(
            context => ({forMain: context.raw}),
            (returned, src) => ({raw: returned.forMain})
          ),
        // slice {forMain: part: x} => {'level2': x}
        'main:level1': () => Rlens(
            context => {
              return ({'level2': context.forMain.part})
            },
            (returned, src) => ({
              ...src, 
              forMain: {
                ...src.forMain,
                part: returned['level2']
              }
            })
          ),
        // slice {'level2': x} => x 
        'main:level1:level2': ({localNodeName}) => RlensPath([localNodeName])
      };
      const callRes = dispatch({
        graph,
        FSMState,
        handlers,
        context,
        action: {type: 'ANYTHING'},
        lenses
      });
      assert.deepEqual({
        arrows: [
          [['main:level1:level2', 'x'], ['main:level1', 'x']]
        ],
        context: {
          raw: {
            part: {
              val: 'changed'
            }
          }
        },
        result: {
          gotContext: {val: 'initial'}
        }
      }, callRes);
    });

    it("applies proper lenses for children's handlers", () => {
      const graph = {
        "main": {
          "type": "graph",
          "nodes": {
            "B": "B"
          },
          "arrows": {},
          "entryPoints": {
            "start": {
              "target": "B",
              "entryPoint": "start"
            }
          }
        },
        "B": {
          "type": "graph",
          "nodes": {
            "C": "C"
          },
          "arrows": {},
          "entryPoints": {
            "start": {
              "target": "C",
              "entryPoint": "start"
            }
          }
        },
        "C": {
          "type": "leaf"
        }
      };

      const FSMState = {
        'main': 'B',
        'B': 'C',
      };

      const renamePropLensF = (oldPropName, newPropName) => () => Rlens(
        (inObj) => keys(inObj).reduce((outObj, key) => ({
          ...outObj,
          [key === oldPropName ? newPropName : key]: inObj[key],
        }), {}),
        (outObj, inObj) => keys(outObj).reduce((newInObj, key) => ({
          ...newInObj,
          [key === newPropName ? oldPropName : key]: outObj[key],
        }), {})
      );

      const lenses = {
        'main': renamePropLensF('d', 'c'),
        'B': renamePropLensF('c', 'b'),
        'C': renamePropLensF('b', 'a'),
      };

      const firstContext = {
        d: 120,
      };

      const incrementProp = (propName, obj) => ({
        ...obj,
        [propName]: obj[propName] + 1
      });

      const handlers = {
        'main': ({action, context, children}) => {
          const childRes = children['B']({action});
          return {
            ...childRes,
            context: incrementProp('c', childRes.context),
            result: {
              contextGotByMain: context,
              contextReturnedByMainChild: childRes.context,
              ...childRes.result,
            }
          };
        },
        'B': ({action, context, children}) => {
          const childRes = children['C']({action});
          return {
            ...childRes,
            context: incrementProp('b', childRes.context),
            result: {
              contextGotByB: context,
              contextReturnedByBChild: childRes.context,
              ...childRes.result,
            }
          };
        },
        'C': ({action, context, children}) => {
          return {
            context: incrementProp('a', context),
            result: {
              contextGotByC: context
            }
          };
        },
      };

      const {result: callRes, context: newContext} = dispatch({
        graph,
        FSMState,
        handlers,
        context: firstContext,
        action: {type: 'ANYTHING'},
        lenses
      });

      assert.deepEqual({d: 123}, newContext);
      assert.deepEqual({
        contextGotByMain: {c: 120},
        contextReturnedByMainChild: {c: 122},
        contextGotByB: {b: 120},
        contextReturnedByBChild: {b: 121},
        contextGotByC: {a: 120},
      }, callRes);
    });
  });

  it('passes node IDs to handlers', () => {

    const graph = {
      'main': {
        type: 'graph',
        nodes: ['main:A'],
      },
      'main:A': {
        type: 'composite',
        nodes: ['main:A:A'],
      },
      'main:A:A': {
        type: 'leaf',
      }
    };

    const FSMState = {
      'main': 'main:A'
    };

    let mainID, mainAID, mainAAID;

    const handlers = {
      'main': (opts) => {
        mainID = opts.node.id;
        return transparentSingleChildHandler(opts);
      },
      'main:A': (opts) => {
        mainAID = opts.node.id;
        return transparentSingleChildHandler(opts);
      },
      'main:A:A': (opts, node) => {
        mainAAID = opts.node.id;
        return {result: null, context: {}, arrows: [[[opts.node.id, undefined]]]};
      }
    };

    dispatch({
      graph,
      FSMState,
      handlers,
      context: {},
      method: "",
      params: [],
      lenses: {
        'main': () => identityLens,
        'main:A': () => identityLens,
        'main:A:A': () => identityLens,
      }
    });

    assert.equal(mainID, 'main');
    assert.equal(mainAID, 'main:A');
    assert.equal(mainAAID, 'main:A:A');

  });

  describe('adapting', () => {

    it('allows to rename a graph leaving arrow', () => {

      const graph = {
        'main': {
          type: 'graph', 
          nodes: ['main:target', 'main:graph_with_leaving_a'],
          arrows: {}
        },
        'main:target': {type: 'leaf'},
        'main:graph_with_leaving_a': {
          type: 'graph', 
          nodes: ['main:graph_with_leaving_a:a', 'main:graph_with_leaving_a:b'],
          arrows: {}
        },
        'main:graph_with_leaving_a:a': {type: 'leaf'},
        'main:graph_with_leaving_a:b': {type: 'leaf'}
      };

      const FSMState = {
        'main': 'main:graph_with_leaving_a',
        'main:graph_with_leaving_a': 'main:graph_with_leaving_a:a'
      };

      const handlers = {

        'main': transparentSingleChildHandler,

        'main:graph_with_leaving_a': ({action, context, node, children}) => {
          const childRes = head(values(children))({action});
          const arrows = renameArrows({a: 'b'}, addNodeToArrows(node.id, childRes.arrows));
          return {
            arrows,
            context: childRes.context,
            result: childRes.result
          };
        },

        'main:graph_with_leaving_a:a': ({action, context, node, child}) => {
          if (action.type == "a") return {arrows: [[[node.id, 'a']]], context};
        },

        'main:graph_with_leaving_a:b': ({action, context,}) => {
          if (action.type == "a") return {arrows: [[[node.id, 'a']]], context};
        },

      };

      const lenses = {
        'main': () => identityLens,
        'main:target': () => identityLens,
        'main:graph_with_leaving_a': () => identityLens,
        'main:graph_with_leaving_a:a': () => identityLens,
        'main:graph_with_leaving_a:b': () => identityLens,
      };

      // Following a by graph_with_leaving_a:a
      assert.deepEqual({
        arrows: [
          [['main:graph_with_leaving_a:a', 'a'], ['main:graph_with_leaving_a', 'b'],]
        ],
        context: {},
        result: undefined
      }, dispatch({
        graph,
        FSMState,
        handlers,
        context: {},
        action: {type: "a"},
        lenses
      }));

    });

  });

  describe('merging the context', () => {

    it('allows parts to be removed', () => {
      const initContext = {a: 2, b: 3};
      const graph = {
        'main': {type: 'leaf'}
      };
      const handlers = {
        'main': () => {
          return {context: {a: 2}};
        },
      };
      const {context} = dispatch({
        graph,
        FSMState: {},
        handlers,
        context: initContext,
        method: "",
        params: [],
        lenses: {
          'main': () => identityLens,
        },
      });
      const expectedContext = {a: 2};
      assert.deepEqual(expectedContext, context);
    });

  });

});