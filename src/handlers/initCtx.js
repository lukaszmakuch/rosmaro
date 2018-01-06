import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';

export default plan => {
  const remainingPlan = omit(plan, ['initCtx']);
  const initCtx = plan.initCtx || {};

  return {
    remainingPlan,
    make: (next) => (opts) => {
      const ctx = isEmpty(opts.ctx) 
        ? initCtx
        : opts.ctx;
      return next({...opts, ctx});
    }
  };
};