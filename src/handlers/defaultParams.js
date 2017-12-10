export default plan => ({
  remainingPlan: plan,
  make: (next) => (opts) => {
    const p = opts.params || [];
    const paramsWithDefaults = [
      p[0] || {}, 
      p[1] || {}
    ];
    return next({
      ...opts, 
      params: paramsWithDefaults
    })
  }
});