/*
The returned object calls the model object 
passing the ID of the node in meta-parameters (second parameter).
*/
const makeThisNodeDecorator = ({model, node}) => new Proxy({}, {
  get(target, method) {
    return function () {
      const params = [...arguments];
      return model[method](params[0], {targetNode: node.ID});
    };
  }
});

export default plan => ({
  remainingPlan: plan,
  make: (next) => ({

    ...next,

    handler: (rawOpts) => {
      const opts = {
        ...rawOpts,
        params: [
          {
            ...rawOpts.params[0],
            thisNode: makeThisNodeDecorator(rawOpts)
          },
          rawOpts.params[1],
        ]
      };
      const targetNode = (opts.params[1] || {}).targetNode;

      const isTarget = (

        // There are no restrictions regarding the target node.
        (targetNode === undefined)

        // This is the target node (or its child).
        || opts.node.ID.startsWith(targetNode)

      );

      return isTarget 
        ? next.handler(opts) 
        : opts.child(opts);
    },

  })
});