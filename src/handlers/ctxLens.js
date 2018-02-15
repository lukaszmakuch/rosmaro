import omit from 'lodash/omit';
import {compose as Rcompose} from 'ramda';

export default plan => {
  const ctxLens = plan.ctxLens;

  if (!ctxLens) {
    // There's no need of doing anything. This stage should be transparent.
    return {
      remainingPlan: plan,
      make: (next) => next
    };
  }

  // There is some lens
  const remainingPlan = omit(plan, ['ctxLens']);

  return {
    remainingPlan,
    make: (next) => ({

      ...next,

      lens: (opts) => Rcompose(
        ctxLens(opts), 
        next.lens(opts)
      )

    })
  };
};