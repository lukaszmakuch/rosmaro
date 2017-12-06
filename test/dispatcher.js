import assert from 'assert';
import dispatch from './../src/dispatcher';
import {mapArrows} from './../src/utils';

describe("dispatcher", () => {

  it('passes node IDs to bindings', () => {

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

    const bindings = {
      'main': (opts) => {
        mainID = opts.rosmaroNode.id;
        return opts.child(opts);
      },
      'main:A': (opts) => {
        mainAID = opts.rosmaroNode.id;
        return opts.child(opts);
      },
      'main:A:A': (opts) => {
        mainAAID = opts.rosmaroNode.id;
        return {res: null, ctx: {}};
      }
    };

    dispatch({
      graph,
      FSMState,
      bindings,
      ctx: {},
      method: "",
      params: []
    });

    assert.equal(mainID, 'main');
    assert.equal(mainAID, 'main:A');
    assert.equal(mainAAID, 'main:A:A');

  });

  describe('async', () => {
    const asyncBinding = async ({ctx}) => {
      return {arrows: [[[null, 'x']]], ctx};
    };
    it('leaves', async () => {
      const graph = {
        main: {type: 'leaf'}
      };
      const bindings = {
        'main': asyncBinding
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
          [['main', 'x']]
        ],
        ctx: {},
        res: undefined
      }, finalCallRes);
    });
    it('graph children', async () => {
      const graph = {
        'main': {type: 'graph', nodes: ['main:A']},
        'main:A': {type: 'leaf', parent: 'main'}
      };
      const FSMState = {'main': 'main:A'};
      const bindings = {
        'main:A': asyncBinding
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
          [['main:A', 'x']]
        ],
        ctx: {},
        res: undefined
      }, finalCallRes);
    });
    it('graph bindings', async () => {
      const graph = {
        'main': {type: 'graph', nodes: ['main:A']},
        'main:A': {type: 'leaf', parent: 'main'}
      };
      const FSMState = {'main': 'main:A'};
      const bindings = {
        'main': async ({child}) => {
          return await child({ctx: {}});
        },
        'main:A': async () => ({res: "leaf res", ctx: {}})
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
          [['main:A', undefined]]
        ],
        ctx: {},
        res: "leaf res"
      }, finalCallRes);
    });
    it('composite children', async () => {
      const graph = {
        'main': {type: 'composite', nodes: ['main:A', 'main:B']},
        'main:A': {type: 'leaf', parent: 'main'},
        'main:B': {type: 'leaf', parent: 'main'}
      };
      const bindings = {
        'main:A': async () => ({res: 'ARes', ctx: {}}),
        'main:B': async () => ({res: 'BRes', ctx: {}}),
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
          [['main:A', undefined]],
          [['main:B', undefined]]
        ],
        ctx: {},
        res: {A: 'ARes', B: 'BRes'}
      }, finalCallRes);
    });
    it('composite bindings', async () => {
      const graph = {
        'main': {type: 'composite', nodes: ['main:A', 'main:B']},
        'main:A': {type: 'leaf', parent: 'main'},
        'main:B': {type: 'leaf', parent: 'main'}
      };
      const bindings = {
        'main': async ({child, ctx}) => {
          const childRes = child({ctx});
          return {
            res: childRes.res.A + "_" + childRes.res.B,
            ctx: {},
            arrows: childRes.arrows
          };
        },
        'main:A': () => ({res: 'ARes', ctx: {}}),
        'main:B': () => ({res: 'BRes', ctx: {}}),
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
          [['main:A', undefined]],
          [['main:B', undefined]]
        ],
        ctx: {},
        res: "ARes_BRes",
      }, finalCallRes);
    });
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

      const bindings = {

        'main:graph_with_leaving_a': ({method, ctx, params, child}) => {
          const childRes = child({method, ctx, params});
          const arrows = mapArrows({a: 'b'}, childRes.arrows);
          return {
            arrows,
            ctx: childRes.ctx,
            res: childRes.res
          };
        },

        'main:graph_with_leaving_a:a': ({method, ctx, params, child}) => {
          child();
          if (method == "a") return {arrows: [[[null, 'a']]], ctx};
        },

        'main:graph_with_leaving_a:b': ({method, ctx, params}) => {
          if (method == "a") return {arrows: [[[null, 'a']]], ctx};
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
      const graph = {
        'main': {type: 'leaf'}
      };
      const bindings = {
        'main': () => {
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

      it('merges only different parts', () => {
        const initCtx = {a: "a", b: "b"};
        const bindings = {
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

    const bindings = {

      'main:B:B': ({method, ctx, params, child}) => {
        const childRes = child({method, ctx, params});
        return {
          ...childRes,
          res: childRes.res.A + "_" + childRes.res.B,
        }
      },

      "main:B:B:A": ({method, ctx, params}) => {
        switch (method) {
          case 'followArrows': 
            return {arrows: [[[null, 'x']]], ctx, res: 'ARes'};
            break;
        }
      },

      "main:B:B:B": ({method, ctx, params}) => {
        switch (method) {
          case 'followArrows': 
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
      bindings,
      ctx,
      method: "followArrows",
      params: []
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

});