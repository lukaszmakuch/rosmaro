const mergeCtxs = (ctx1, ctx2) => ({
  ...ctx1,
  ...ctx2
});

const extractBound = (allBound, desiredRoot) =>
  Object.keys(allBound).reduce((extracted, node) => {
    if (!node.startsWith(desiredRoot)) return extracted;

    // +1 for the ":" mark
    const extractedNode = node.substr(desiredRoot.length + 1);
    const binding = allBound[node];
    return {
      ...extracted, 
      [extractedNode]: binding
    };
  }, {});

const prepend = (prefix, node) => node
  ? prefix + ":" + node
  : prefix;

const prependToBound = (bound, nodePrefix) =>
  Object.keys(bound).reduce((expanded, node) => ({
    ...expanded,
    [prepend(nodePrefix, node)]: bound[node]
  }), {})

const extendArrows = (callRes, prefix) => ({
  ...callRes,
  arrows: prependToBound(callRes.arrows, prefix)
});

const getSubGraph = (graph, node) => ({'': graph.nodes[node]});

const dispatch = ({
  graph, 
  FSMState, 
  bindings, 
  ctx, 
  method, 
  params
}) => {
  const binding = bindings[''];
  const nodeType = graph[''].type;
  return ({

    'leaf': () => {
      const leafRes = binding({method, ctx, params});
      return {
        arrows: {'': leafRes.arrow},
        ctx: leafRes.ctx,
        res: leafRes.res
      }
    },

    'composite': () => {
      const composedNodes = Object.keys(graph[''].nodes);

      const childFn = ({method, ctx, params}) => {
        return composedNodes.reduce((soFar, childNode) => {
          const childRes = extendArrows(dispatch({
            graph: getSubGraph(graph[''], childNode),
            FSMState: extractBound(FSMState, childNode),
            bindings: extractBound(bindings, childNode),
            ctx,
            method,
            params
          }), childNode);

          return {
            arrows: {...soFar.arrows, ...childRes.arrows},
            ctx: mergeCtxs(soFar.ctx, childRes.ctx),
            res: {...soFar.res, [childNode]: childRes.res}
          };
        }, {arrows: {}, ctx: {}, res: undefined});
      };

      return binding({method, ctx, params, child: childFn});
    },

    'graph': () => {
      const activeChild = FSMState[''];
      const childFn = ({method, ctx, params}) => {
        return dispatch({
          graph: getSubGraph(graph[''], activeChild),
          FSMState: extractBound(FSMState, activeChild),
          bindings: extractBound(bindings, activeChild),
          ctx,
          method,
          params
        });
      }

      const childRes = binding({method, ctx, params, child: childFn});
      return extendArrows(childRes, activeChild);
    },
  })[nodeType]();
};

export default dispatch;