import assert from 'assert';
import dispatch from './api';
import {mapArrows} from './../utils';
import {
  transparentSingleChildHandler, 
  mergeCtxs, 
  mergeArrows,
  addNodeToArrows
} from './../handlerUtils';
import {identity as Ridentity, lens as Rlens, dissoc, prop, keys, lensPath as RlensPath, head, values, map} from 'ramda';

const identityLens = () => Rlens(Ridentity, Ridentity);

describe("dispatcher", () => {

  it("calls bound methods based on the FSM state", () => {
    const graph = {
      'main': {type: 'graph', nodes: ['main:A', 'main:B']},
      'main:A': {type: 'leaf', parent: 'main'},
      'main:B': {type: 'graph', nodes: ['main:B:A', 'main:B:B'], parent: 'main'},
      'main:B:A': {type: 'leaf', parent: 'main:B'},
      'main:B:B': {type: 'composite', nodes: ['main:B:B:A', 'main:B:B:B'], parent: 'main:B'},
      'main:B:B:A': {type: 'leaf', parent: 'main:B:B'},
      'main:B:B:B': {type: 'leaf', parent: 'main:B:B'}
    };

    const FSMState = {
      'main': 'main:B',
      'main:B': 'main:B:B'
    };

    const lenses = {
      'main': identityLens,
      'main:A': identityLens,
      'main:B': identityLens,
      'main:B:A': identityLens,
      'main:B:B': identityLens,
      'main:B:B:A': identityLens,
      'main:B:B:B': identityLens,
    };

    const handlers = {

      'main': transparentSingleChildHandler,

      'main:B': transparentSingleChildHandler,

      'main:B:B': ({action, ctx, children, node}) => {
        const allResults = map(child => child({action}), children);
        return {
          ctx: mergeCtxs(ctx, values(map(prop('ctx'), allResults))),
          arrows: addNodeToArrows(node.id, mergeArrows(map(prop('arrows'), values(allResults)))),
          res: allResults.A.res + "_" + allResults.B.res,
        };
      },

      "main:B:B:A": ({action, ctx, node}) => {
        switch (action.type) {
          case 'FOLLOW_ARROWS': 
            return {arrows: [[[node.id, 'x']]], ctx, res: 'ARes'};
            break;
        }
      },

      "main:B:B:B": ({action, ctx, node}) => {
        switch (action.type) {
          case 'FOLLOW_ARROWS': 
            return {arrows: [[[node.id, 'y']]], ctx, res: 'BRes'};
            break;
        }
      }
    };

    const ctx = {
      a: 100, b: 200
    };

    const callRes = dispatch({
      graph,
      FSMState,
      handlers,
      ctx,
      action: {type: 'FOLLOW_ARROWS'},
      lenses
    });

    const expectedCallRes = {
      arrows: [
        [['main:B:B:A', 'x'], ['main:B:B', 'x'], ['main:B', 'x']],
        [['main:B:B:B', 'y'], ['main:B:B', 'y'], ['main:B', 'y']]
      ],
      ctx: {a: 100, b: 200},
      res: 'ARes_BRes'
    };

    assert.deepEqual(expectedCallRes, callRes);
  });

  describe('lenses', () => {

    it('composes lenses', () => {
      const ctx = {
        raw: {
          part: {
            val: 'initial'
          }
        }
      };
      const graph = {
        'main': {type: 'graph', nodes: ['main:level1']},
        'main:level1': {type: 'composite', parent: 'main', nodes: ['main:level1:level2']},
        'main:level1:level2': {type: 'leaf', parent: 'main:level1'}
      };
      const FSMState = {
        'main': 'main:level1'
      };
      const handlers = {
        'main': transparentSingleChildHandler,
        'main:level1': transparentSingleChildHandler,
        'main:level1:level2': ({ctx, node}) => {
          return {
            res: {gotCtx: ctx},
            ctx: {val: 'changed'},
            arrows: [[[node.id, 'x']]]
          };
        },
      };
      const lenses = {
        // simple map {raw} => {forMain}
        'main': () => Rlens(
            ctx => ({forMain: ctx.raw}),
            (returned, src) => ({raw: returned.forMain})
          ),
        // slice {forMain: part: x} => {'level2': x}
        'main:level1': () => Rlens(
            ctx => {
              return ({'level2': ctx.forMain.part})
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
        ctx,
        action: {type: 'ANYTHING'},
        lenses
      });
      assert.deepEqual({
        arrows: [
          [['main:level1:level2', 'x'], ['main:level1', 'x']]
        ],
        ctx: {
          raw: {
            part: {
              val: 'changed'
            }
          }
        },
        res: {
          gotCtx: {val: 'initial'}
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

      const firstCtx = {
        d: 120,
      };

      const incrementProp = (propName, obj) => ({
        ...obj,
        [propName]: obj[propName] + 1
      });

      const handlers = {
        'main': ({action, ctx, children}) => {
          const childRes = children['B']({action});
          return {
            ...childRes,
            ctx: incrementProp('c', childRes.ctx),
            res: {
              ctxGotByMain: ctx,
              ctxReturnedByMainChild: childRes.ctx,
              ...childRes.res,
            }
          };
        },
        'B': ({action, ctx, children}) => {
          const childRes = children['C']({action});
          return {
            ...childRes,
            ctx: incrementProp('b', childRes.ctx),
            res: {
              ctxGotByB: ctx,
              ctxReturnedByBChild: childRes.ctx,
              ...childRes.res,
            }
          };
        },
        'C': ({action, ctx, children}) => {
          return {
            ctx: incrementProp('a', ctx),
            res: {
              ctxGotByC: ctx
            }
          };
        },
      };

      const {res: callRes, ctx: newCtx} = dispatch({
        graph,
        FSMState,
        handlers,
        ctx: firstCtx,
        action: {type: 'ANYTHING'},
        lenses
      });

      assert.deepEqual({d: 123}, newCtx);
      assert.deepEqual({
        ctxGotByMain: {c: 120},
        ctxReturnedByMainChild: {c: 122},
        ctxGotByB: {b: 120},
        ctxReturnedByBChild: {b: 121},
        ctxGotByC: {a: 120},
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
        parent: 'main'
      },
      'main:A:A': {
        type: 'leaf',
        parent: 'main:A'
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
        return {res: null, ctx: {}, arrows: [[[opts.node.id, undefined]]]};
      }
    };

    dispatch({
      graph,
      FSMState,
      handlers,
      ctx: {},
      method: "",
      params: [],
      lenses: {
        'main': identityLens,
        'main:A': identityLens,
        'main:A:A': identityLens,
      }
    });

    assert.equal(mainID, 'main');
    assert.equal(mainAID, 'main:A');
    assert.equal(mainAAID, 'main:A:A');

  });

  describe('adapting', () => {

    it('allows to rename a graph leaving arrow', () => {

      const graph = {
        'main': {type: 'graph', nodes: ['main:target', 'main:graph_with_leaving_a']},
        'main:target': {type: 'leaf', parent: 'main'},
        'main:graph_with_leaving_a': {
          type: 'graph', 
          nodes: ['main:graph_with_leaving_a:a', 'main:graph_with_leaving_a:b']
        },
        'main:graph_with_leaving_a:a': {type: 'leaf', parent: 'main:graph_with_leaving_a'},
        'main:graph_with_leaving_a:b': {type: 'leaf', parent: 'main:graph_with_leaving_a'}
      };

      const FSMState = {
        'main': 'main:graph_with_leaving_a',
        'main:graph_with_leaving_a': 'main:graph_with_leaving_a:a'
      };

      const handlers = {

        'main': transparentSingleChildHandler,

        'main:graph_with_leaving_a': ({action, ctx, node, children}) => {
          const childRes = head(values(children))({action});
          const arrows = mapArrows({a: 'b'}, addNodeToArrows(node.id, childRes.arrows));
          return {
            arrows,
            ctx: childRes.ctx,
            res: childRes.res
          };
        },

        'main:graph_with_leaving_a:a': ({action, ctx, node, child}) => {
          if (action.type == "a") return {arrows: [[[node.id, 'a']]], ctx};
        },

        'main:graph_with_leaving_a:b': ({action, ctx,}) => {
          if (action.type == "a") return {arrows: [[[node.id, 'a']]], ctx};
        },

      };

      // Following a by graph_with_leaving_a:a
      assert.deepEqual({
        arrows: [
          [['main:graph_with_leaving_a:a', 'a'], ['main:graph_with_leaving_a', 'b'],]
        ],
        ctx: {},
        res: undefined
      }, dispatch({
        graph,
        FSMState,
        handlers,
        ctx: {},
        action: {type: "a"},
        lenses: {
          'main': identityLens,
          'main:target': identityLens,
          'main:graph_with_leaving_a': identityLens,
          'main:graph_with_leaving_a:a': identityLens,
          'main:graph_with_leaving_a:b': identityLens,
        }
      }));

    });

  });

  describe('merging the context', () => {

    it('allows parts to be removed', () => {
      const initCtx = {a: 2, b: 3};
      const graph = {
        'main': {type: 'leaf'}
      };
      const handlers = {
        'main': () => {
          return {ctx: {a: 2}};
        },
      };
      const {ctx} = dispatch({
        graph,
        FSMState: {},
        handlers,
        ctx: initCtx,
        method: "",
        params: [],
        lenses: {
          'main': identityLens,
        },
      });
      const expectedCtx = {a: 2};
      assert.deepEqual(expectedCtx, ctx);
    });

  });

});