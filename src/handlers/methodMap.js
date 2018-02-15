import omit from 'lodash/omit';

export default plan => {

  const renameMethod = method => {
    const methodMap = plan.methodMap || {};
    const renamedMethod = methodMap[method];
    return renamedMethod || method;
  };

  return {

    remainingPlan: omit(plan, ['methodMap']),
    
    make: (next) => ({

      ...next,

      handler: (opts) => next.handler({
        ...opts,
        method: renameMethod(opts.method)
      })
  
    })

  };
};