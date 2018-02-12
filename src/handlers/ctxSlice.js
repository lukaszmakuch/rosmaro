import omit from 'lodash/omit';
import {combineCtxTransformFns} from './utils';

const localNodeNameSlice = () => ({
  in: ({src, localNodeName}) => (src[localNodeName] || {}),
  out: ({src, localNodeName, returned}) => ({
    ...src,
    [localNodeName]: returned
  })
});

const objectPropertySliceFns = ctxSlicePath => ({
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
});

const getCtxMapFn = ctxSlicePath => {
  if (ctxSlicePath === 'localNodeName') {
    return localNodeNameSlice(ctxSlicePath);
  } else {
    return objectPropertySliceFns(ctxSlicePath);
  }
};

export default plan => {
  const ctxSlicePath = plan.ctxSlice;

  if (!ctxSlicePath) {
    // The handler is meant to receive the whole context.
    // There's no need of doing anything. This stage should be transparent.
    return {
      remainingPlan: plan,
      make: (next) => ({
        handler: (opts) => next.handler(opts),
        ctxTransformFn: next.ctxTransformFn
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

      ctxTransformFn: combineCtxTransformFns({
        first: getCtxMapFn(ctxSlicePath), 
        then: next.ctxTransformFn
      })

    })
  };
};