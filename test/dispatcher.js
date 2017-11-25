import assert from 'assert';
import dispatch from './../src/dispatcher';

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

describe("dispatcher", () => {

  it("calls bound methods based on the FSM state", () => {

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
          res: childRes.res.A + "_" + childRes.res.B
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
      arrows: {'B:B:A': 'x', 'B:B:B': 'y'},
      ctx: {a: 100, b: 200},
      res: 'ARes_BRes'
    };

    assert.deepEqual(callRes, expectedCallRes);
  });

});