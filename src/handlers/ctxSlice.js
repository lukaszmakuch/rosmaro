import omit from 'lodash/omit';
import {compose as Rcompose, lensPath as RlensPath} from 'ramda';

export default plan => {
  const ctxSlicePath = plan.ctxSlice;

  if (!ctxSlicePath) {
    // The handler is meant to receive the whole context.
    // There's no need of doing anything. This stage should be transparent.
    return {
      remainingPlan: plan,
      make: (next) => ({
        handler: (opts) => next.handler(opts),
        lens: next.lens
      })
    };
  }

  // The handler requires a context slice. 
  // This stage is required to provide this.
  const remainingPlan = omit(plan, ['ctxSlice']);

  return {
    remainingPlan,
    make: (next) => ({

      ...next,

      lens: (opts) => Rcompose(
        RlensPath([ctxSlicePath]), 
        next.lens(opts)
      )

    })
  };
};