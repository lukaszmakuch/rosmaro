import assert from 'assert';
import dispatch from './../src/dispatcher';
import {mapArrows} from './../src/utils';

/*
[ ] async
[ ] optional arrows
[ ] history?
*/

describe("dispatcher", () => {

  describe('async', () => {
    const asyncBinding = async ({ctx}) => {
      return {arrow: 'x', ctx};
    };
    it('leaves', async () => {
      const graph = {type: 'leaf'};
      const bindings = {
        '': asyncBinding
      };
      const callRes = dispatch({
        graph,
        FSMState: {},
        bindings,
        ctx: {},
        method: "",
        params: []
      });
      assert(callRes.then);
      const finalCallRes = await callRes;
      assert.deepEqual({
        arrows: [
          [['', 'x']]
        ],
        ctx: {},
        res: undefined
      }, finalCallRes);
    });
    it('graph children', async () => {
      const graph = {
        type: 'graph',
        nodes: {A: {type: 'leaf'}}
      };
      const FSMState = {'': 'A'};
      const bindings = {
        'A': asyncBinding
      };
      const callRes = dispatch({
        graph,
        FSMState,
        bindings,
        ctx: {},
        method: "",
        params: []
      });
      assert(callRes.then);
      const finalCallRes = await callRes;
      assert.deepEqual({
        arrows: [
          [['A', 'x'], ['', 'x']]
        ],
        ctx: {},
        res: undefined
      }, finalCallRes);
    });
    it('graph bindings', async () => {
      const graph = {
        type: 'graph',
        nodes: {A: {type: 'leaf'}}
      };
      const FSMState = {'': 'A'};
      const bindings = {
        '': async ({child}) => {
          return await child({ctx: {}});
        },
        'A': async () => ({res: "leaf res", ctx: {}})
      };
      const callRes = dispatch({
        graph,
        FSMState,
        bindings,
        ctx: {},
        method: "",
        params: []
      });
      const finalCallRes = await callRes;
      assert.deepEqual({
        arrows: [
          [['A', undefined], ['', undefined]]
        ],
        ctx: {},
        res: "leaf res"
      }, finalCallRes);
    });
    it('composite children', async () => {
      const graph = {
        type: 'composite',
        nodes: {
          A: {type: 'leaf'},
          B: {type: 'leaf'},
        }
      };
      const bindings = {
        'A': async () => ({res: 'ARes', ctx: {}}),
        'B': async () => ({res: 'BRes', ctx: {}}),
      };
      const callRes = dispatch({
        graph,
        FSMState: {},
        bindings,
        ctx: {},
        method: "",
        params: []
      });
      const finalCallRes = await callRes;
      assert.deepEqual({
        arrows: [
          [['A', undefined], ['', undefined]],
          [['B', undefined], ['', undefined]]
        ],
        ctx: {},
        res: {A: 'ARes', B: 'BRes'}
      }, finalCallRes);
    });
    it('composite bindings', async () => {
      const graph = {
        type: 'composite',
        nodes: {
          A: {type: 'leaf'},
          B: {type: 'leaf'},
        }
      };
      const bindings = {
        '': async ({child, ctx}) => {
          const childRes = child({ctx});
          return {
            res: childRes.res.A + "_" + childRes.res.B,
            ctx: {},
            arrows: childRes.arrows
          };
        },
        'A': () => ({res: 'ARes', ctx: {}}),
        'B': () => ({res: 'BRes', ctx: {}}),
      };
      const callRes = dispatch({
        graph,
        FSMState: {},
        bindings,
        ctx: {},
        method: "",
        params: []
      });
      const finalCallRes = await callRes;
      assert.deepEqual({
        arrows: [
          [['A', undefined], ['', undefined]],
          [['B', undefined], ['', undefined]]
        ],
        ctx: {},
        res: "ARes_BRes",
      }, finalCallRes);
    });
  });

  describe('adapting', () => {

    it('allows to rename a graph leaving arrow', () => {

      const graph = {
        type: 'graph',
        nodes: {
          target: {type: 'leaf'},
          graph_with_leaving_a: {
            type: 'graph',
            nodes: {
              a: {type: 'leaf'},
              b: {type: 'leaf'}
            }
          }
        }
      };

      const FSMState = {
        '': 'graph_with_leaving_a',
        'graph_with_leaving_a': 'a'
      };

      const bindings = {

        'graph_with_leaving_a': ({method, ctx, params, child}) => {
          const childRes = child({method, ctx, params});
          const arrows = mapArrows({a: 'b'}, childRes.arrows);
          return {
            arrows,
            ctx: childRes.ctx,
            res: childRes.res
          };
        },

        'graph_with_leaving_a:a': ({method, ctx, params}) => {
          if (method == "a") return {arrow: 'a', ctx};
        },

        'graph_with_leaving_a:b': ({method, ctx, params}) => {
          if (method == "a") return {arrow: 'a', ctx};
        },

      };

      // Following a by graph_with_leaving_a:a
      assert.deepEqual({
        arrows: [
          [['graph_with_leaving_a:a', 'a'], ['graph_with_leaving_a', 'b'], ['', 'b']]
        ],
        ctx: {},
        res: undefined
      }, dispatch({
        graph,
        FSMState,
        bindings,
        ctx: {},
        method: "a",
        params: []
      }));

    });

  });

  describe('merging the context', () => {

    it('allows parts to be removed', () => {
      const initCtx = {a: 2, b: 3};
      const graph = {type: 'leaf'};
      const bindings = {
        '': () => {
          return {ctx: {a: 2}};
        },
      };
      const {ctx} = dispatch({
        graph,
        FSMState: {},
        bindings,
        ctx: initCtx,
        method: "",
        params: []
      });
      const expectedCtx = {a: 2};
      assert.deepEqual(expectedCtx, ctx);
    });

    describe('composites', () => {
      const graph = {
        type: 'composite',
        nodes: {
          A: {
            type: 'graph',
            nodes: {
              A: {type: 'leaf'}
            }
          },
          B: {
            type: 'graph',
            nodes: {
              A: {type: 'leaf'}
            }
          }
        }
      };
      const FSMState = {
        'A': 'A',
        'B': 'A',
      };

      it('merges only different parts', () => {
        const initCtx = {a: "a", b: "b"};
        const bindings = {
          'A:A': ({method, ctx, params}) => {
            return {arrow: 'x', ctx: {a: "z", b: "b"}};
          },
          'B:A': ({method, ctx, params}) => {
            return {arrow: 'y', ctx: {a: "a", b: "x"}};
          }
        };
        const {ctx} = dispatch({
          graph,
          FSMState,
          bindings,
          ctx: initCtx,
          method: "",
          params: []
        });
        const expectedCtx = {a: "z", b: "x"};
        assert.deepEqual(expectedCtx, ctx);
      });

      it('merges the context in case of simultaneous transitions', () => {
        const bindings = {
          'A:A': ({method, ctx, params}) => {
            return {arrow: 'x', ctx: {a: 2}};
          },
          'B:A': ({method, ctx, params}) => {
            return {arrow: 'y', ctx: {b: 3}};
          }
        };
        const {ctx} = dispatch({
          graph,
          FSMState,
          bindings,
          ctx: {},
          method: "",
          params: []
        });
        const expectedCtx = {a: 2, b: 3};
        assert.deepEqual(expectedCtx, ctx);
      })

    });

  });

  it("calls bound methods based on the FSM state", () => {
    const graph = {
      type: 'graph',
      nodes: {
        A: {type: 'leaf'},
        B: {
          type: 'graph',
          nodes: {
            A: {type: 'leaf'},
            B: {
              type: 'composite',
              nodes: {
                A: {type: 'leaf'},
                B: {type: 'leaf'},
              }
            }
          }
        }
      }
    };

    const FSMState = {
      '': 'B',
      'B': 'B'
    };

    const bindings = {

      'B:B': ({method, ctx, params, child}) => {
        const childRes = child({method, ctx, params});
        return {
          ...childRes,
          res: childRes.res.A + "_" + childRes.res.B,
        }
      },

      "B:B:A": ({method, ctx, params}) => {
        switch (method) {
          case 'followArrows': 
            return {arrow: 'x', ctx, res: 'ARes'};
            break;
        }
      },

      "B:B:B": ({method, ctx, params}) => {
        switch (method) {
          case 'followArrows': 
            return {arrow: 'y', ctx, res: 'BRes'};
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
      bindings,
      ctx,
      method: "followArrows",
      params: []
    });
    const expectedCallRes = {
      arrows: [
        [['B:B:A', 'x'], ['B:B', 'x'], ['B', 'x'], ['', 'x']],
        [['B:B:B', 'y'], ['B:B', 'y'], ['B', 'y'], ['', 'y']]
      ],
      ctx: {a: 100, b: 200},
      res: 'ARes_BRes'
    };

    assert.deepEqual(expectedCallRes, callRes);
  });

});