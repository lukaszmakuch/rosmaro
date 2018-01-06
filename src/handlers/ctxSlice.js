import omit from 'lodash/omit';
import {callbackize} from './../utils';

export default plan => {
  const ctxSlicePath = plan.ctxSlice;

  if (!ctxSlicePath) {
    // The handler is meant to receive the whole context.
    // There's no need of doing anything. This stage should be transparent.
    return {
      remainingPlan: plan,
      make: (next) => (opts) => next(opts)
    };
  }

  // The handler requires a context slice. 
  // This stage is required to provide this.
  const remainingPlan = omit(plan, ['ctxSlice']);

  return {
    remainingPlan,
    make: (next) => (opts) => {
      const initialCtxSlice = opts.ctx[ctxSlicePath] || {};
      const optsWithSlice = {...opts, ctx: initialCtxSlice};

      return callbackize(() => next(optsWithSlice), callRes => {
        const extendedCtx = {
          ...opts.ctx,
          [ctxSlicePath]: callRes.ctx
        };
        return {
          ...callRes,
          ctx: extendedCtx
        };
      });
    }
  };
};