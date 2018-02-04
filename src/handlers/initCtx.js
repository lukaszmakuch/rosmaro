import omit from 'lodash/omit';
import isEmpty from 'lodash/isEmpty';
import {combineCtxMapFns} from './utils';

export default plan => {
  const remainingPlan = omit(plan, ['initCtx']);
  const initCtx = plan.initCtx || {};

  return {
    remainingPlan,
    make: (next) => ({

      ...next,

      ctxMapFn: combineCtxMapFns({
        first: {
          in: ({src, localNodeName}) => isEmpty(src) ? initCtx : src,
          out: ({returned}) => returned
        }, 
        then: next.ctxMapFn
      })

    })
  };
};