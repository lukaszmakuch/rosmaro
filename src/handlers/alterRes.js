import filter from 'lodash/filter';
import {callbackize} from './../utils';

const isAlterFn = fnName => fnName.startsWith('after') && fnName != 'afterLeft';

export default plan => {
  const {remainingPlan, alterFns} = Object.keys(plan).reduce(
    (soFar, planElem) => {
      if (isAlterFn(planElem)) {
        return {...soFar, alterFns: {...soFar.alterFns, [planElem]: plan[planElem]}};
      } else {
        return {...soFar, remainingPlan: {...soFar.remainingPlan, [planElem]: plan[planElem]}};
      }
    }, 
    {remainingPlan: {}, alterFns: {}}
  );

  return {
    remainingPlan: remainingPlan,
    make: (next) => (opts) => {
      return callbackize(() => next(opts), callRes => {
        const alterFnName = 'after' + opts.method[0].toUpperCase() + opts.method.slice(1);
        const alterFn = alterFns[alterFnName] || (({res}) => res);
        const alteredRes = alterFn({res: callRes.res});
        return {
          ...callRes,
          res: alteredRes
        };
      });
    }
  };

};