import omit from 'lodash/omit';
import {combineCtxMapFns} from './utils';

export default plan => {
  const ctxSlicePath = plan.ctxSlice;

  if (!ctxSlicePath) {
    // The handler is meant to receive the whole context.
    // There's no need of doing anything. This stage should be transparent.
    return {
      remainingPlan: plan,
      make: (next) => ({
        handler: (opts) => next.handler(opts),
        ctxMapFn: next.ctxMapFn
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

      ctxMapFn: combineCtxMapFns({
        first: {
          in: ({src, localNodeName}) => {
            const ctxSlice = src[ctxSlicePath] || {};
            return ctxSlice;
          },
          out: ({src, returned, localNodeName}) => {
            return {
              ...src,
              [ctxSlicePath]: returned
            }
          }
        }, 
        then: next.ctxMapFn
      })

    })
  };
};