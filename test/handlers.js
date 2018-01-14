import assert from 'assert';
import makeHandler from './../src/handlers/api';

const finalChild = ({ctx}) => ({arrows: [[[null, null]]], ctx, res: undefined});

describe('handlers', () => {

  xdescribe('with self', () => {

  });

  describe('ctxSlice', () => {

    it('allows to use a narrow slice of the whole context', () => {
      const handler = makeHandler({
        ctxSlice: 'for the handler',
        method: ({ctx}) => ({
          res: {receivedCtx: ctx},
          ctx: {val: 456}
        })
      });

      assert.deepEqual(handler({
        method: 'method',
        node: {},
        params: [],
        ctx: {
          higher: 987, 
          'for the handler': {val: 123}
        },
      }), {
        res: {receivedCtx: {val: 123}},
        arrows: [[[null, null]]],
        ctx: {
          higher: 987, 
          'for the handler': {val: 456}
        }
      });
    });

    it('creates the slice if it does not exist', () => {
      const handler = makeHandler({
        ctxSlice: 'for the handler',
        method: ({ctx}) => ({
          res: {receivedCtx: ctx},
          ctx: {val: 456}
        })
      });

      assert.deepEqual(handler({
        method: 'method',
        node: {},
        params: [],
        ctx: {
          higher: 987
        },
      }), {
        res: {receivedCtx: {}},
        arrows: [[[null, null]]],
        ctx: {
          higher: 987, 
          'for the handler': {val: 456}
        }
      });
    });

    it('may be used with initCtx', () => {
      const handler = makeHandler({
        ctxSlice: 'for the handler',
        initCtx: {val: 123},
        method: ({ctx}) => ({
          res: {receivedCtx: ctx},
          ctx: {val: 456}
        })
      });

      assert.deepEqual(handler({
        method: 'method',
        node: {},
        params: [],
        ctx: {
          higher: 987
        },
      }), {
        res: {receivedCtx: {val: 123}},
        arrows: [[[null, null]]],
        ctx: {
          higher: 987, 
          'for the handler': {val: 456}
        }
      });
    });

  });

  describe('initCtx', () => {
    const handler = makeHandler({
      initCtx: {a: 123, b: 456},
      method: ({ctx}) => ctx
    });

    it('allows to set an initial context if the context is empty', () => {
      assert.deepEqual(handler({
        method: 'method',
        node: {},
        params: [],
        ctx: {},
      }), {
        res: {a: 123, b: 456},
        arrows: [[[null, null]]],
        ctx: {a: 123, b: 456}
      });
    });

    it('does NOT use the initial context if there is already some context', () => {
      assert.deepEqual(handler({
        method: 'method',
        node: {},
        params: [],
        ctx: {c: 987},
      }), {
        res: {c: 987},
        arrows: [[[null, null]]],
        ctx: {c: 987}
      });
    });

  });

  describe('alter result', () => {
    it('allows to alter the result of a method call', () => {

      const handler = makeHandler({
        method: () => 'result',
        afterMethod: ({res}) => 'altered ' + res
      });

      assert.deepEqual(handler({
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

      const handler = makeHandler({
        myMethod: (opts) => {
          passed = opts
          return {
            res: 'handlerRes',
            arrow: 'instanceArrow',
            ctx: {instance: 'ctx'}
          }
        }
      });

      const matchingCallRes = handler({
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

      const differentCallRes = handler({
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
        const handler = makeHandler({
          [method]: ({ctx}) => {
            return 'method res';
          }
        });

        // it's the target
        assert.deepEqual(handler({
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
        assert.deepEqual(handler({
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

  describe('leaf', () => {

    it('associates functions with methods', () => {
      const model = {};

      let receivedByA;
      let receivedByB;

      const handler = makeHandler({

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

      });

      const aRes = handler({
        ctx: {whole: 'ctx'},
        method: 'a',
        params: [{paramA: 'a', paramB: 'b'}],
        model
      });
      const bRes = handler({
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
      const handler = makeHandler({
        a: () => ({res: 'aRes', arrow: 'x', ctx: {x: 987}})
      });
      assert.deepEqual(handler({
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
      const handler = makeHandler({
        a: () => 'just this'
      });
      assert.deepEqual(handler({method: 'a', ctx: {init: 123}, params: []}), {
        res: 'just this',
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return nothing', () => {
      const handler = makeHandler({a: () => {}});
      assert.deepEqual(handler({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just an arrow', () => {
      const handler = makeHandler({
        a: () => ({arrow: 'x'})
      });
      assert.deepEqual(handler({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, 'x']]]
      });
    });

  });

});