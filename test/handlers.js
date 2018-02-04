import assert from 'assert';
import makeHandlers from './../src/handlers/api';

const finalChild = ({ctx}) => ({arrows: [[[null, null]]], ctx, res: undefined});

const assertTransparentCtxMapFn = (mapFn) => {
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

describe('handlers', () => {

  describe('dynamic nodes', () => {

    it('returns an empty list by default', () => {
      const {nodes} = makeHandlers({
        dynamic: {
        }
      });

      assert.deepEqual([], nodes.dynamic());
    });

    it('returns the provided function if any', () => {
      const nodesFn = ({ctx}) => ctx.elems;

      const {nodes} = makeHandlers({
        dynamic: {
          nodes: nodesFn
        }
      });

      const elems = ['a', 'b', 'c'];
      const ctx = {elems};

      assert.deepEqual(elems, nodes.dynamic({ctx}));
    });

  });

  describe('ctxSlice', () => {

    it('allows to use a narrow slice of the whole context', () => {
      const {handlers, ctxMapFns} = makeHandlers({
        node: {
          ctxSlice: 'for the handler',
          method: ({ctx}) => ({
            res: {receivedCtx: ctx},
            ctx: {val: 456}
          })
        }
      });

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
      assert.deepEqual(ctxMapFns.node.in({
        src: {
          higher: 987, 
          'for the handler': {val: 123}
        },
        localNodeName: 'anything',
      }), {val: 123});
      assert.deepEqual(ctxMapFns.node.out({
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
      const {ctxMapFns} = makeHandlers({
        node: {
          ctxSlice: 'for the handler'
        }
      });

      assert.deepEqual(ctxMapFns.node.in({
        src: {
          higher: 987, 
        },
        localNodeName: 'anything',
      }), {});
      assert.deepEqual(ctxMapFns.node.out({
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
      const {ctxMapFns} = makeHandlers({
        node: {
          ctxSlice: 'for the handler',
          initCtx: {val: 123}
        }
      });

      assert.deepEqual(ctxMapFns.node.in({
        src: {
          higher: 987, 
        },
        localNodeName: 'anything',
      }), {val: 123});
      assert.deepEqual(ctxMapFns.node.out({
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
    const {handlers, ctxMapFns} = makeHandlers({
      node: {
        initCtx: {a: 123, b: 456},
        method: ({ctx}) => ctx
      }
    });

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
      // context mapping functions are responsible for the initial context
      assert.deepEqual(ctxMapFns.node.in({
        src: {},
        localNodeName: 'anything',
      }), {a: 123, b: 456});
      assert.deepEqual(ctxMapFns.node.out({
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
      // context mapping functions are responsible for the initial context
      assert.deepEqual(ctxMapFns.node.in({
        src: {c: 987},
        localNodeName: 'anything',
      }), {c: 987});
      assert.deepEqual(ctxMapFns.node.out({
        src: {c: 987},
        returned: {c: 987},
        localNodeName: 'anything',
      }), {c: 987});
    });

  });

  describe('alter result', () => {
    it('allows to alter the result of a method call', () => {

      const {handlers, ctxMapFns} = makeHandlers({
        node: {
          method: () => 'result',
          afterMethod: ({res}) => 'altered ' + res
        }
      });

      assertTransparentCtxMapFn(ctxMapFns.node);

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

      const {handlers, ctxMapFns} = makeHandlers({
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
      });

      assertTransparentCtxMapFn(ctxMapFns.node);

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
      const {handlers, ctxMapFns} = makeHandlers({
        otherNode: {
          a: () => ({res: 'aRes', arrow: 'x', ctx: {x: 987}})
        }
      });
      assertTransparentCtxMapFn(ctxMapFns.otherNode);
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
      const {handlers, ctxMapFns} = makeHandlers({
        node: {
          a: () => 'just this'
        }
      });
      assertTransparentCtxMapFn(ctxMapFns.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: 'just this',
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return nothing', () => {
      const {handlers, ctxMapFns} = makeHandlers({
        node: {
          a: () => {}
        }
      });
      assertTransparentCtxMapFn(ctxMapFns.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just an arrow', () => {
      const {handlers, ctxMapFns} = makeHandlers({
        node: {a: () => ({arrow: 'x'})}
      });
      assertTransparentCtxMapFn(ctxMapFns.node);
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

      const {handlers, ctxMapFns} = makeHandlers({
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
      });

      assertTransparentCtxMapFn(ctxMapFns.node);

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

  describe('node actions', () => {
    it('calls afterLeft and onEntry actions only for their target nodes', () => {
      ['onEntry', 'afterLeft'].forEach(method => {
        const {handlers, ctxMapFns} = makeHandlers({
          node: {
            [method]: ({ctx}) => {
              return 'method res';
            }
          }
        });

        assertTransparentCtxMapFn(ctxMapFns.node);

        // it's the target
        assert.deepEqual(handlers.node({
          method, 
          ctx: {init: 123}, 
          params: [{}, {targetID: 'x'}], 
          child: finalChild,
          node: {ID: 'x'}
        }), {
          res: 'method res',
          ctx: {init: 123},
          arrows: [[[null, null]]]
        });        

        // it's not the target
        assert.deepEqual(handlers.node({
          method,
          ctx: {init: 123}, 
          params: [undefined, {targetID: 'x'}], 
          child: finalChild,
          node: {ID: 'y'}
        }), {
          res: undefined,
          ctx: {init: 123},
          arrows: [[[null, null]]]
        });
      });
    });
  });

});