import assert from 'assert';
import makeHandlers from './../src/handlers/api';
import invert from 'lodash/invert';

const finalChild = ({ctx}) => ({arrows: [[[null, null]]], ctx, res: undefined});

const assertTransparentCtxTransformFn = (mapFn) => {
  const ctx = {a: 123, b: 456};
  assert.deepEqual(
    ctx,
    mapFn.in({
      src: ctx, 
      localNodeName: 'anything'
    })
  );
  assert.deepEqual(
    ctx,
    mapFn.out({
      returned: ctx, 
      src: ctx, 
      localNodeName: 'anything'
    })
  );
};

// All we need to build handlers is to read the list of all nodes.
const mockGraph = nodes => invert(nodes);

describe('handlers', () => {

  it('always provides a complete list of ctxTransformFns', () => {
    const {ctxTransformFns} = makeHandlers({}, mockGraph(['A']));
    assertTransparentCtxTransformFn(ctxTransformFns.A);
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
      const {handlers, ctxTransformFns} = makeHandlers({
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
      assert.deepEqual(ctxTransformFns.node.in({
        src: {
          higher: 987, 
          'for the handler': {val: 123}
        },
        localNodeName: 'anything',
      }), {val: 123});
      assert.deepEqual(ctxTransformFns.node.out({
        src: {
          higher: 987, 
          'for the handler': {val: 123}
        },
        returned: {val: 456},
        localNodeName: 'anything',
      }), {
        higher: 987, 
        'for the handler': {val: 456}
      });
    });

    it('creates the slice if it does not exist', () => {
      const {ctxTransformFns} = makeHandlers({
        node: {
          ctxSlice: 'for the handler'
        }
      }, mockGraph(['node']));

      assert.deepEqual(ctxTransformFns.node.in({
        src: {
          higher: 987, 
        },
        localNodeName: 'anything',
      }), {});
      assert.deepEqual(ctxTransformFns.node.out({
        src: {
          higher: 987
        },
        returned: {val: 123},
        localNodeName: 'anything',
      }), {
        higher: 987, 
        'for the handler': {val: 123}
      });

    });

    it('may be used with initCtx', () => {
      const {ctxTransformFns} = makeHandlers({
        node: {
          ctxSlice: 'for the handler',
          initCtx: {val: 123}
        }
      }, mockGraph(['node']));

      assert.deepEqual(ctxTransformFns.node.in({
        src: {
          higher: 987, 
        },
        localNodeName: 'anything',
      }), {val: 123});
      assert.deepEqual(ctxTransformFns.node.out({
        src: {
          higher: 987
        },
        returned: {val: 456},
        localNodeName: 'anything',
      }), {
        higher: 987, 
        'for the handler': {val: 456}
      });

    });

  });

  describe('initial context', () => {
    const {handlers, ctxTransformFns} = makeHandlers({
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
      // context transforming functions are responsible for the initial context
      assert.deepEqual(ctxTransformFns.node.in({
        src: {},
        localNodeName: 'anything',
      }), {a: 123, b: 456});
      assert.deepEqual(ctxTransformFns.node.out({
        src: {},
        returned: {a: 123, b: 456},
        localNodeName: 'anything',
      }), {a: 123, b: 456});
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
      // context transforming functions are responsible for the initial context
      assert.deepEqual(ctxTransformFns.node.in({
        src: {c: 987},
        localNodeName: 'anything',
      }), {c: 987});
      assert.deepEqual(ctxTransformFns.node.out({
        src: {c: 987},
        returned: {c: 987},
        localNodeName: 'anything',
      }), {c: 987});
    });

  });

  describe('alter result', () => {
    it('allows to alter the result of a method call', () => {

      const {handlers, ctxTransformFns} = makeHandlers({
        node: {
          method: () => 'result',
          afterMethod: ({res}) => 'altered ' + res
        }
      }, mockGraph(['node']));

      assertTransparentCtxTransformFn(ctxTransformFns.node);

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

  describe('leaf', () => {

    it('associates functions with methods', () => {
      const model = {};

      let receivedByA;
      let receivedByB;

      const {handlers, ctxTransformFns} = makeHandlers({
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

      assertTransparentCtxTransformFn(ctxTransformFns.node);

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
      const {handlers, ctxTransformFns} = makeHandlers({
        otherNode: {
          a: () => ({res: 'aRes', arrow: 'x', ctx: {x: 987}})
        }
      }, mockGraph(['a']));
      assertTransparentCtxTransformFn(ctxTransformFns.otherNode);
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
      const {handlers, ctxTransformFns} = makeHandlers({
        node: {
          a: () => 'just this'
        }
      }, mockGraph(['node']));
      assertTransparentCtxTransformFn(ctxTransformFns.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: 'just this',
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return nothing', () => {
      const {handlers, ctxTransformFns} = makeHandlers({
        node: {
          a: () => {}
        }
      }, mockGraph(['node']));
      assertTransparentCtxTransformFn(ctxTransformFns.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just an arrow', () => {
      const {handlers, ctxTransformFns} = makeHandlers({
        node: {a: () => ({arrow: 'x'})}
      }, mockGraph(['node']));
      assertTransparentCtxTransformFn(ctxTransformFns.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, 'x']]]
      });
    });

  });

  describe('for particular instance', () => {
    it('calls a method only if the current node is a particular instance', () => {
      const model = {};

      let childCalled, passed;

      const child = () => {
        childCalled = true;
        return {
          res: 'childRes',
          arrows: [[[null, 'childArrow']]],
          ctx: {child: 'ctx'}
        };
      };

      const {handlers, ctxTransformFns} = makeHandlers({
        node: {
          myMethod: (opts) => {
            passed = opts
            return {
              res: 'handlerRes',
              arrow: 'instanceArrow',
              ctx: {instance: 'ctx'}
            }
          }
        }
      }, mockGraph(['node']));

      assertTransparentCtxTransformFn(ctxTransformFns.node);

      const matchingCallRes = handlers.node({
        method: 'forParticularInstance',
        node: {instanceID: 'abc', ID: 'main:A:B'},
        params: [{a: 2, b: 3}, {
          targetInstance: 'abc', 
          originalMethod: 'myMethod'
        }],
        ctx: {whole: 'ctx'},
        model,
        child
      });
      assert.deepEqual(matchingCallRes, {
        res: 'handlerRes',
        arrows: [[[null, 'instanceArrow']]],
        ctx: {instance: 'ctx'}
      });
      assert.deepEqual(passed, {
        ctx: {whole: 'ctx'}, 
        a: 2, 
        b: 3, 
        thisModel: model, 
        thisNode: {instanceID: 'abc', ID: 'main:A:B'}
      });
      passed = undefined;
      childCalled = undefined;

      const differentCallRes = handlers.node({
        method: 'forParticularInstance',
        node: {instanceID: 'abc', ID: 'main:A:B'},
        params: [{a: 2, b: 3}, {
          targetInstance: 'qwe', 
          originalMethod: 'myMethod'
        }],
        ctx: {whole: 'ctx'},
        model,
        child
      });
      assert.deepEqual(differentCallRes, {
        res: 'childRes',
        arrows: [[[null, 'childArrow']]],
        ctx: {child: 'ctx'}
      });
      assert.deepEqual(undefined, passed);
      assert.deepEqual(childCalled, true);
      
    });

  });

});