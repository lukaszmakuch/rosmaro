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
    }
  }
};
export default methods => {
  return ({method, ctx, params, model, child, node}) => {
    if (!methods[method]) return {res: undefined, ctx, arrows: [[[null, null]]]};
    
    const callRes = extendRes(methods[method]({
      ctx,
      ...(params[0]|| {}),
      thisModel: model
    }), ctx);
    return {
      res: callRes.res,
      ctx: callRes.ctx,
      arrows: [[[null, callRes.arrow]]]
    }
  };
};