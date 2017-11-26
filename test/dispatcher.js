import assert from 'assert';
import dispatch from './../src/dispatcher';
import {mapArrows} from './../src/utils';

/*
TODO:
[ ] adapting capabilities
[ ] renaming only leaving arrows
[ ] decorating nodes to adapt them
[ ] flat graph
[ ] nested graph
[ ] async
[ ] history?
[ ] optional,
[ ] optional "dummy" bindings
[ ] starting with a leaf
[ ] starting with a graph
[ ] starting with a composite
[ ] composite of composites
[ ] mapping entering context
[ ] mapping leaving context
[ ] altering method name
[ ] altering call result
[ ] call result of a composite
[ ] rename leaving arrows
[ ] context partitioning
[ ] altering arguments
[ ] passing parameters
*/

describe("dispatcher", () => {

  describe('adapting', () => {

    it('allows to rename a graph leaving arrow', () => {

      const graph = {
        '': {
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
        }
      };

      const FSMAtA = {
        '': 'graph_with_leaving_a',
        'graph_with_leaving_a': 'a'
      };      

      const FSMAtB = {
        '': 'graph_with_leaving_a',
        'graph_with_leaving_a': 'b'
      };

      const bindings = {

        '': ({method, ctx, params, child}) => {
          return child({method, ctx, params});
        },

        'graph_with_leaving_a': ({method, ctx, params, child}) => {
          const childRes = child({method, ctx, params});
          const arrows = mapArrows({a: 'b'}, childRes.arrows);
          console.log(require('util').inspect({arrows}, false, 30));
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
        FSMState: FSMAtA,
        bindings,
        ctx: {},
        method: "a",
        params: []
      }));
      
      // Following a by graph_with_leaving_a:b
      assert.deepEqual({
        arrows: [
          [['graph_with_leaving_a:b', 'a'], ['graph_with_leaving_a', 'b'], ['', 'b']]
        ],
        ctx: {},
        res: undefined
      }, dispatch({
        graph,
        FSMState: FSMAtB,
        bindings,
        ctx: {},
        method: "a",
        params: []
      }));

    });

  });

  it("calls bound methods based on the FSM state", () => {
    const graph = {
      '': {
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