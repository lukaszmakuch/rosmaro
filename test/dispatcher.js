import assert from 'assert';
import dispatch from './../src/dispatcher';
import {mapArrows} from './../src/utils';

/*
TODO:
[ ] adapting capabilities
[ ] decorating nodes to adapt them
[ ] flat graph
[ ] async
[ ] history?
[ ] optional,
[ ] optional "dummy" bindings
[ ] composite of composites
[ ] mapping entering context
[ ] mapping leaving context
[ ] call result of a composite
[ ] context partitioning
[ ] altering arguments
[ ] passing parameters
*/

describe("dispatcher", () => {

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

        '': ({method, ctx, params, child}) => {
          return child({method, ctx, params});
        },

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

      '': ({method, ctx, params, child}) => {
        return child({method, ctx, params});
      },

      'B': ({method, ctx, params, child}) => {
        return child({method, ctx, params});
      },

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