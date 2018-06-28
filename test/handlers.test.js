import assert from 'assert';
import makeHandlers from './../src/handlers/api';
import invert from 'lodash/invert';
import {view as Rview, set as Rset, lens as Rlens} from 'ramda';

const finalChild = ({ctx}) => ({arrows: [[[null, null]]], ctx, res: undefined});

const assertIdentityLens = lensFactory => {
  const lens = lensFactory();
  const ctx = {a: 123, b: 456};
  assert.deepEqual(
    ctx,
    Rview(lens, ctx)
  );
  assert.deepEqual(
    ctx,
    Rset(lens, ctx, ctx)
  );
}

// All we need to build handlers is to read the list of all nodes.
const mockGraph = nodes => invert(nodes);

describe('handlers', () => {

  it('always provides a complete list of lenses', () => {
    const {lenses} = makeHandlers({}, mockGraph(['A']));
    assertIdentityLens(lenses.A);
  });

  describe('context lenses', () => {
    it('is a way to transform the context', () => {

      const {handlers, lenses} = makeHandlers({
        node: {

          //this slice is applied BEFORE the initCtx
          ctxSlice: 'sub',

          initCtx: {
            text: 'hello',
            another: 123
          },

          ctxLens: ({localNodeName}) => Rlens(
            ctx => ({
              text: ctx.text + " " + localNodeName
            }),
            (returned, src) => ({
              ...src,
              text: returned.text.replace(localNodeName, "world")
            })
          )

        }
      }, mockGraph(['node']));

      assert.deepEqual(
        Rview(lenses.node({localNodeName: 'node'}), {}),
        {text: 'hello node'}
      );
      assert.deepEqual(
        Rset(lenses.node({localNodeName: 'node'}), {text: 'hi node'}, {}),
        {
          sub: {
            another: 123,
            text: 'hi world'
          }
        }
      );

    });
  });

  describe('dynamic nodes', () => {

    it('returns an empty list by default', () => {
      const {nodes} = makeHandlers({
        dynamic: {
        }
      }, mockGraph(['dynamic']));

      assert.deepEqual([], nodes.dynamic());
    });

    it('returns the provided function if any', () => {
      const nodesFn = ({ctx}) => ctx.elems;

      const {nodes} = makeHandlers({
        dynamic: {
          nodes: nodesFn
        }
      }, mockGraph(['dynamic']));

      const elems = ['a', 'b', 'c'];
      const ctx = {elems};

      assert.deepEqual(elems, nodes.dynamic({ctx}));
    });

  });

  describe('ctxSlice', () => {

    it('allows to use a narrow slice of the whole context', () => {
      const {handlers, lenses} = makeHandlers({
        node: {
          ctxSlice: 'for the handler',
          method: ({ctx}) => ({
            res: {receivedCtx: ctx},
            ctx: {val: 456}
          })
        }
      }, mockGraph(['node']));

      assert.deepEqual(handlers.node({
        method: 'method',
        node: {},
        params: [],
        ctx: {
          higher: 987, 
          'for the handler': {val: 123}
        },
      }), {
        res: {receivedCtx: {
          higher: 987, 
          'for the handler': {val: 123}
        }},
        arrows: [[[null, null]]],
        ctx: {val: 456}
      });

      assert.deepEqual(
        Rview(
          lenses.node({localNodeName: 'anything'}), 
          {
            higher: 987, 
            'for the handler': {val: 123}
          }
        ),
        {val: 123}
      );
      assert.deepEqual(
        Rset(
          lenses.node({localNodeName: 'anything'}), 
          {val: 456}, 
          {
            higher: 987, 
            'for the handler': {val: 123}
          }
        ),
        {
          higher: 987, 
          'for the handler': {val: 456}
        }
      );

    });

    it('creates the slice if it does not exist', () => {
      const {lenses} = makeHandlers({
        node: {
          ctxSlice: 'for the handler'
        }
      }, mockGraph(['node']));

      assert.deepEqual(
        Rview(
          lenses.node({localNodeName: 'anything'}), 
          {
            higher: 987, 
          }
        ),
        {}
      );
      assert.deepEqual(
        Rset(
          lenses.node({localNodeName: 'anything'}), 
          {val: 123}, 
          {
            higher: 987, 
          }
        ),
        {
          higher: 987, 
          'for the handler': {val: 123}
        }
      );

    });

    it('may be used with initCtx', () => {
      const {lenses} = makeHandlers({
        node: {
          ctxSlice: 'for the handler',
          initCtx: {val: 123}
        }
      }, mockGraph(['node']));

      assert.deepEqual(
        Rview(
          lenses.node({localNodeName: 'anything'}), 
          {
            higher: 987, 
          }
        ),
        {val: 123}
      );
      assert.deepEqual(
        Rset(
          lenses.node({localNodeName: 'anything'}), 
          {val: 456}, 
          {
            higher: 987, 
          }
        ),
        {
          higher: 987, 
          'for the handler': {val: 456}
        }
      );

    });

  });

  describe('initial context', () => {
    const {handlers, lenses} = makeHandlers({
      node: {
        initCtx: {a: 123, b: 456},
        method: ({ctx}) => ctx
      }
    }, mockGraph(['node']));

    it('allows to set an initial context if the context is empty', () => {
      // the handler itself doesn't modify the context
      assert.deepEqual(handlers.node({
        method: 'method',
        node: {},
        params: [],
        ctx: {},
      }), {
        res: {},
        arrows: [[[null, null]]],
        ctx: {}
      });
      assert.deepEqual(
        Rview(
          lenses.node({localNodeName: 'anything'}), 
          {}
        ),
        {a: 123, b: 456}
      );
      assert.deepEqual(
        Rset(
          lenses.node({localNodeName: 'anything'}), 
          {a: 123, b: 456}, 
          {}
        ),
        {a: 123, b: 456}
      );
    });

    it('does NOT use the initial context if there is already some context', () => {
      assert.deepEqual(handlers.node({
        method: 'method',
        node: {},
        params: [],
        ctx: {c: 987},
      }), {
        res: {c: 987},
        arrows: [[[null, null]]],
        ctx: {c: 987}
      });
      assert.deepEqual(
        Rview(
          lenses.node({localNodeName: 'anything'}), 
          {c: 987}
        ),
        {c: 987}
      );
      assert.deepEqual(
        Rset(
          lenses.node({localNodeName: 'anything'}), 
          {c: 987}, 
          {c: 987}
        ),
        {c: 987}
      );
    });

  });

  describe('alter result', () => {
    it('allows to alter the result of a method call', () => {

      const {handlers, lenses} = makeHandlers({
        node: {
          method: () => 'result',
          afterMethod: ({res}) => 'altered ' + res
        }
      }, mockGraph(['node']));

      assertIdentityLens(lenses.node);

      assert.deepEqual(handlers.node({
        method: 'method',
        node: {},
        params: [],
        ctx: {},
      }), {
        res: 'altered result',
        arrows: [[[null, null]]],
        ctx: {}
      });

    });
  });

  describe('renaming methods', () => {

    it('allows to rename methods', () => {

      const {handlers, lenses} = makeHandlers({
        node: {
          methodMap: {
            x: 'a',
            y: 'c'
          },
          a: () => 'a res',
          b: () => 'b res',
          c: () => 'c res',
        }
      }, mockGraph(['node']));

      assertIdentityLens(lenses.node);

      const assertRes = ({method, expectedRes}) => assert.deepEqual(
        handlers.node({
          method,
          node: {},
          params: [{param: 123}],
          ctx: {whole: 'ctx'},
          model: {},
          child: () => {}
        }), 
        {
          res: expectedRes,
          arrows: [[[null, null]]],
          ctx: {whole: 'ctx'}
        }
      );

      assertRes({method: 'x', expectedRes: 'a res'});
      assertRes({method: 'b', expectedRes: 'b res'});
      assertRes({method: 'y', expectedRes: 'c res'});

    });

  });

  describe('leaf', () => {

    it('associates functions with methods', () => {
      const model = {};

      let receivedByA;
      let receivedByB;

      const {handlers, lenses} = makeHandlers({
        node: {
          a({ctx, paramA, paramB, thisModel}) {
            receivedByA = {ctx, paramA, paramB, thisModel};
            return {
              res: 'aRes',
              ctx: {aCtx: 123},
              arrow: 'aArrow'
            };
          },

          b: ({ctx, param, thisModel}) => {
            receivedByB = {ctx, thisModel};
            return {
              res: 'bRes',
              ctx: {bCtx: 123},
              arrow: 'bArrow'
            };
          }
        }
      }, mockGraph(['node', 'b']));

      assertIdentityLens(lenses.node);

      const aRes = handlers.node({
        ctx: {whole: 'ctx'},
        method: 'a',
        params: [{paramA: 'a', paramB: 'b'}],
        model
      });
      const bRes = handlers.node({
        ctx: {whole: 'ctx'},
        method: 'b',
        params: [],
        model
      });

      assert.deepEqual(receivedByA, {
        ctx: {whole: 'ctx'},
        paramA: 'a',
        paramB: 'b',
        thisModel: model
      });
      assert.deepEqual(aRes, {
        arrows: [[[null, 'aArrow']]],
        ctx: {aCtx: 123},
        res: 'aRes'
      });

      assert.deepEqual(receivedByB, {
        ctx: {whole: 'ctx'},
        thisModel: model
      });
      assert.deepEqual(bRes, {
        arrows: [[[null, 'bArrow']]],
        ctx: {bCtx: 123},
        res: 'bRes'
      });

    });

    it('does nothing when a method is not found', () => {
      const {handlers, lenses} = makeHandlers({
        otherNode: {
          a: () => ({res: 'aRes', arrow: 'x', ctx: {x: 987}})
        }
      }, mockGraph(['a']));
      assertIdentityLens(lenses.otherNode);
      assert.deepEqual(handlers.otherNode({
        method: 'x', 
        ctx: {init: 123}, 
        params: [], 
        child: finalChild
      }), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just a result', () => {
      const {handlers, lenses} = makeHandlers({
        node: {
          a: () => 'just this'
        }
      }, mockGraph(['node']));
      assertIdentityLens(lenses.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: 'just this',
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return nothing', () => {
      const {handlers, lenses} = makeHandlers({
        node: {
          a: () => {}
        }
      }, mockGraph(['node']));
      assertIdentityLens(lenses.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just an arrow', () => {
      const {handlers, lenses} = makeHandlers({
        node: {a: () => ({arrow: 'x'})}
      }, mockGraph(['node']));
      assertIdentityLens(lenses.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, 'x']]]
      });
    });

  });

  describe('calling particular node (and its children)', () => {

    it('allows to call just one child of a composite', () => {

      const model = {};

      const child = () => {
        return {
          res: 'childRes',
          arrows: [[[null, 'childArrow']]],
          ctx: {child: 'ctx'}
        };
      };

      const {handlers, lenses} = makeHandlers({
        target: {
          myMethod: (opts) => {
            return {
              res: 'targetResult',
              arrow: 'targetArrow',
              ctx: {target: 'ctx'}
            }
          }
        }
      }, mockGraph(['target']));

      assertIdentityLens(lenses.target);

      // this call is meant to be received by this handler
      assert.deepEqual(
        handlers.target({
          method: 'myMethod',
          node: {instanceID: 'abc', ID: 'main:A:B'},
          params: [{a: 2, b: 3}, {
            targetNode: 'main:A:B'
          }],
          ctx: {whole: 'ctx'},
          model,
          child
        }), 
        {
          res: 'targetResult',
          arrows: [[[null, 'targetArrow']]],
          ctx: {target: 'ctx'}
        }
      );

      // the target node may be a parent node as well
      assert.deepEqual(
        handlers.target({
          method: 'myMethod',
          node: {instanceID: 'abc', ID: 'main:A:B'},
          params: [{a: 2, b: 3}, {
            targetNode: 'main:A'
          }],
          ctx: {whole: 'ctx'},
          model,
          child
        }), 
        {
          res: 'targetResult',
          arrows: [[[null, 'targetArrow']]],
          ctx: {target: 'ctx'}
        }
      );

      // this call is not meant to be received by the handler
      assert.deepEqual(
        handlers.target({
          method: 'myMethod',
          node: {instanceID: 'abc', ID: 'main:B'},
          params: [{a: 2, b: 3}, {
            targetNode: 'main:A:B'
          }],
          ctx: {whole: 'ctx'},
          model,
          child
        }), 
        {
          res: 'childRes',
          arrows: [[[null, 'childArrow']]],
          ctx: {child: 'ctx'}
        }
      );
    });

    it('passes thisModelNode object to every handler', () => {

      const {handlers} = makeHandlers({
        node: {
          getthisModelNode: ({thisModelNode}) => ({res: thisModelNode})
        }
      }, mockGraph(['node']));

      const model = {
        modelMethod: function () { return {passedToModel: [...arguments]}; }
      };

      const thisModelNode = handlers.node({
        method: 'getthisModelNode',
        node: {instanceID: 'abc', ID: 'main:B'},
        params: [],
        ctx: {},
        model,
        child: () => {}
      }).res;

      assert.deepEqual(
        {passedToModel: [{paramA: 123, paramB: 456}, {targetNode: 'main:B'}]},
        thisModelNode.modelMethod({paramA: 123, paramB: 456})
      );

    });

  });

});