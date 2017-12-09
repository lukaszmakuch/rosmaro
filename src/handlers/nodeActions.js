export default handler => ({method, ctx, params, model, child, node}) => {
  if (['onEntry', 'afterLeft'].includes(method)) {
    // that's a node action call
    if (params[0] === node.ID) {
      // it's meant to be received by this handler
      return handler({method, ctx, params: [], model, child, node});
    } else {
      // it's meant to be received by a different handler, 
      // so make this one transparent
      return child({method, ctx, params, model, child, node});
    }

  } else {
    // that's a regular call, let the handler handle it
    return handler({method, ctx, params, model, child, node});
  }
};
