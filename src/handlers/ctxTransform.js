import omit from 'lodash/omit';
import {combineCtxTransformFns} from './utils';

export default plan => {
  const ctxTransformFns = plan.ctxTransform;

  if (!ctxTransformFns) {
    // There's no need of doing anything. This stage should be transparent.
    return {
      remainingPlan: plan,
      make: (next) => next
    };
  }

  // There are some context transforming functions provided
  const remainingPlan = omit(plan, ['ctxTransform']);

  return {
    remainingPlan,
    make: (next) => ({

      ...next,

      ctxTransformFn: combineCtxTransformFns({
        first: ctxTransformFns,
        then: next.ctxTransformFn
      })

    })
  };
};