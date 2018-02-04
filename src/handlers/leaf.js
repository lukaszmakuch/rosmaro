import {callbackize} from './../utils';
import {transparentCtxMapFns} from './utils';

const extendRes = (res, ctx) => {
  if (!res) return {res: undefined, arrow: null, ctx};

  if (res.arrow || res.ctx || res.res) {
    // returned an object which may be just a transition request with no result
    return {
      res: res.res,
      ctx: res.ctx || ctx,
      arrow: res.arrow 
    };
  } else {
    // returned just some result
    return {
      res,
      arrow: null,
      ctx
    };
  }
};

export default plan => ({
  remainingPlan: {},
  make: (next) => ({

    handler: ({method, ctx, params, model, child, node}) => {
      if (!plan[method]) return next.handler({method, ctx, params, model, child, node});

      return callbackize(
        () => plan[method]({
          ctx,
          ...params[0],
          thisModel: model,
          thisNode: node
        }),
        rawRes => {
          const callRes = extendRes(rawRes, ctx);
          return {
            res: callRes.res,
            ctx: callRes.ctx,
            arrows: [[[null, callRes.arrow]]]
          };
        }
      );
    },

    ctxMapFn: transparentCtxMapFns

  })
});