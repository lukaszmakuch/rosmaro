import assert from 'assert';
import {leaf} from './../src/index';

describe('handlers', () => {

  describe('leaf', () => {

    it('associates functions with methods', () => {
      const model = {};

      let receivedByA;
      let receivedByB;

      const handler = leaf({

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
      const handler = leaf({
        a: () => ({res: 'aRes', arrow: 'x', ctx: {x: 987}})
      });
      assert.deepEqual(handler({method: 'x', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just a result', () => {
      const handler = leaf({
        a: () => 'just this'
      });
      assert.deepEqual(handler({method: 'a', ctx: {init: 123}, params: []}), {
        res: 'just this',
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return nothing', () => {
      const handler = leaf({a: () => {}});
      assert.deepEqual(handler({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just an arrow', () => {
      const handler = leaf({
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