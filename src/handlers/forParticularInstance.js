import {transparentCtxMapFns} from './utils';

export default plan => ({
  remainingPlan: plan,
  make: (next) => ({

    handler: ({method, ctx, params, model, child, node}) => {
      if (method === 'forParticularInstance') {
        // that's a call meant to be received by a particular instance
        const {targetInstance, originalMethod} = params[1] || {};
        if (targetInstance === node.instanceID) {
          // it's meant to be received by this handler
          return next.handler({
            method: originalMethod, 
            ctx, 
            params,
            model, 
            child, 
            node
          });
        } else {
          // it's meant to be received by a different handler, 
          // so make this one transparent
          return child({method, ctx, params, model, child, node});
        }

      } else {
        // that's a regular call, let the handler handle it
        return next.handler({method, ctx, params, model, child, node});
      }
    },

    ctxMapFn: transparentCtxMapFns,

  })
});