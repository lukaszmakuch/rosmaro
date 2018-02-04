const actionNames = ['onEntry', 'afterLeft'];

export default plan => ({
  remainingPlan: plan,
  make: (next) => ({

    handler: ({method, ctx, params, model, child, node}) => {
      if (actionNames.includes(method)) {
        // that's a node action call
        if (params[1]['targetID'] === node.ID) {
          // it's meant to be received by this handler
          return next.handler({method, ctx, params: [{}, params[1]], model, child, node});
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

    ctxMapFn: next.ctxMapFn

  })
});