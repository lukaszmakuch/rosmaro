import assert from 'assert';
import dispatch from './api';
import {mapArrows} from './../utils';
import {identity as Ridentity, lens as Rlens, lensPath as RlensPath} from 'ramda';

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

      'main:B:B': ({action, ctx, child}) => {
        const childRes = child({action});
        return {
          ...childRes,
          res: childRes.res.A + "_" + childRes.res.B,
        }
      },

      "main:B:B:A": ({action, ctx}) => {
        switch (action.type) {
          case 'FOLLOW_ARROWS': 
            return {arrows: [[[null, 'x']]], ctx, res: 'ARes'};
            break;
        }
      },

      "main:B:B:B": ({action, ctx}) => {
        switch (action.type) {
          case 'FOLLOW_ARROWS': 
            return {arrows: [[[null, 'y']]], ctx, res: 'BRes'};
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

  it('uses lenses', () => {
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
      'main': (opts) => opts.child({action: opts.action}),
      'main:level1': (opts) => {
        const childRes = opts.child({action: opts.action});
        return {
          ...childRes,
          res: childRes.res['level2']
        };
      },
      'main:level1:level2': ({ctx, child}) => {
        return {
          res: {gotCtx: ctx},
          ctx: {val: 'changed'},
          arrows: [[[null, 'x']]]
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
        mainID = opts.node.ID;
        return opts.child(opts);
      },
      'main:A': (opts) => {
        mainAID = opts.node.ID;
        return opts.child(opts);
      },
      'main:A:A': (opts) => {
        mainAAID = opts.node.ID;
        return {res: null, ctx: {}};
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

        'main:graph_with_leaving_a': ({action, ctx, child}) => {
          const childRes = child({action});
          const arrows = mapArrows({a: 'b'}, childRes.arrows);
          return {
            arrows,
            ctx: childRes.ctx,
            res: childRes.res
          };
        },

        'main:graph_with_leaving_a:a': ({action, ctx, child}) => {
          if (action.type == "a") return {arrows: [[[null, 'a']]], ctx};
        },

        'main:graph_with_leaving_a:b': ({action, ctx,}) => {
          if (action.type == "a") return {arrows: [[[null, 'a']]], ctx};
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

    describe('composites', () => {
      const graph = {
        'main': {type: 'composite', nodes: ['main:A', 'main:B']},
        'main:A': {type: 'graph', nodes: ['main:A:A', 'main:A:B'], parent: 'main'},
        'main:B': {type: 'graph', nodes: ['main:B:A', 'main:B:B'], parent: 'main'},
        'main:A:A': {type: 'leaf', parent: 'main:A'},
        'main:A:B': {type: 'leaf', parent: 'main:A'},
        'main:B:A': {type: 'leaf', parent: 'main:B'},
        'main:B:B': {type: 'leaf', parent: 'main:B'}
      };
      const FSMState = {
        'main:A': 'main:A:A',
        'main:B': 'main:B:A',
      };
      const lenses = {
        'main': identityLens,
        'main:A': identityLens,
        'main:B': identityLens,
        'main:A:A': identityLens,
        'main:A:B': identityLens,
        'main:B:A': identityLens,
        'main:B:B': identityLens,
      };

      it('allows parts to be added', () => {
        const initCtx = {a: "a", b: "b"};
        const handlers = {
          'main:A:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'x']]], ctx: {a: "a", b: "b"}};
          },
          'main:B:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'y']]], ctx: {a: "a", b: "b", c: "c"}};
          }
        };
        const {ctx} = dispatch({
          graph,
          FSMState,
          handlers,
          ctx: initCtx,
          method: "",
          params: [],
          lenses,
        });
        const expectedCtx = {a: "a", b: "b", c: "c"};
        assert.deepEqual(expectedCtx, ctx);
      });

      it('is possible to remove parts of the context by a node', () => {
        const initCtx = {arr: [{elem: "a"}, {elem: "b"}]};
        const handlers = {
          'main:A:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'y']]], ctx: {arr: [{elem: "b"}]}};
          },
          'main:B:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'x']]], ctx: {arr: [{elem: "a"}, {elem: "b"}]}};
          }
        };
        const {ctx} = dispatch({
          graph,
          FSMState,
          handlers,
          ctx: initCtx,
          method: "",
          params: [],
          lenses,
        });
        const expectedCtx = {arr: [{elem: "b"}]};
        assert.deepEqual(expectedCtx, ctx);
      });

      it('merges only different parts', () => {
        const initCtx = {a: "a", b: "b"};
        const handlers = {
          'main:A:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'x']]], ctx: {a: "z", b: "b"}};
          },
          'main:B:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'y']]], ctx: {a: "a", b: "x"}};
          }
        };
        const {ctx} = dispatch({
          graph,
          FSMState,
          handlers,
          ctx: initCtx,
          method: "",
          params: [],
          lenses,
        });
        const expectedCtx = {a: "z", b: "x"};
        assert.deepEqual(expectedCtx, ctx);
      });

      it('merges the context in case of simultaneous transitions', () => {
        const handlers = {
          'main:A:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'x']]], ctx: {a: 2}};
          },
          'main:B:A': ({method, ctx, params}) => {
            return {arrows: [[[null, 'y']]], ctx: {b: 3}};
          }
        };
        const {ctx} = dispatch({
          graph,
          FSMState,
          handlers,
          ctx: {},
          method: "",
          params: [],
          lenses,
        });
        const expectedCtx = {a: 2, b: 3};
        assert.deepEqual(expectedCtx, ctx);
      })

    });

  });

});