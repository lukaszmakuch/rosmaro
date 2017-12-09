import assert from 'assert';
import {callbackize} from './../src/utils';

describe('utils', () => {

  describe('callbackize', () => {

    it('may call resCb in the same tick', () => {
      let received;

      callbackize(
        () => 42,
        val => received = val
      );

      assert.equal(42, received);
    });

    it('calls errCb in the same tick when the error is thrown', () => {
      let thrown;
      let received;
      const error = new Error();

      callbackize(
        () => {throw error},
        val => received = val,
        err => thrown = err
      );

      assert(!received);
      assert.strictEqual(thrown, error);
    });

    it('lets resCb return rejected promises', async () => {
      const error = new Error();
      let passedToErrCb, caught;

      try {
        await callbackize(
          () => 42,
          val => Promise.reject(error),
          err => passedToErrCb = err
        );
      } catch (err) {
        caught = err;
      }

      assert(!passedToErrCb);
      assert.strictEqual(error, caught);

    });

    it('returns a promise when the block returns a promise', (done) => {
      const callRes = callbackize(
        async () => 42,
        val => {
          assert.equal(val, 42);
          done();
        }
      );
      assert(callRes.then);
    });

    it('calls errCb when the block returns a rejected promise', (done) => {
      const error = new Error();
      assert(callbackize(
        async () => {throw error},
        a => a,
        caught => {
          assert.strictEqual(caught, error);
          done();
        }
      ).then);
    });

    it('throws the error by default', async () => {
      const error = new Error();
      let thrown;

      try {
        await callbackize(async () => {throw error});
      } catch (err) {
        thrown = err;
      }

      assert.strictEqual(error, thrown);

    });

  })

});