import {transparentCtxTransformFns} from './utils';

export default plan => ({
  remainingPlan: plan,
  make: (next) => ({

    ...next,

    handler: (opts) => {
      const p = opts.params || [];
      const paramsWithDefaults = [
        p[0] || {}, 
        p[1] || {}
      ];
      return next.handler({
        ...opts, 
        params: paramsWithDefaults
      })
    },

  })
});