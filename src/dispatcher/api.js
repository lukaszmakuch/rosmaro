import {withResolved, extractPromises} from './../utils';
import {mergeCtxs} from './ctx';

const defaultParentBinding = ({method, ctx, params, child}) => {
  return child({method, ctx, params});
};

// arrows like [ [['a:a:a', 'x']] [['a:a:b', 'x']] ]
// node like 'a:a'
// res like [ [['a:a:a', 'x'], ['a:a', 'x']] [['a:a:b', 'x'], ['a:a', 'x']] ]
const addNodeToArrows = (node, arrows) => arrows.map(arrow => node === 'main'
  ? arrow
  : [
    ...arrow,
    [node, arrow[arrow.length - 1][1]]
  ]
);

const dummyChildFn = () => ({
  arrows: [[[null, undefined]]],
  ctx: {},
  res: undefined
});

const dispatch = ({
  graph, 
  node = 'main',
  FSMState, 
  bindings, 
  ctx, 
  method,
  instanceID,
  params
}) => {
  const binding = bindings[node] || defaultParentBinding;
  const nodeType = graph[node].type;
  const nodeData = {ID: node, instanceID: instanceID[node]};
  const callDispatch = ({node, ctx, method, params}) => dispatch({
    graph,
    node,
    FSMState,
    bindings,
    ctx,
    instanceID,
    method,
    params
  });

  if (nodeType === 'leaf') {
    const leafRes = binding({method, ctx, params, child: dummyChildFn, node: nodeData});
    return withResolved(leafRes, (leafRes) => ({
      arrows: leafRes.arrows 
        ? [[[node, leafRes.arrows[0][0][1]]]]
        : [[[node, undefined]]],
      ctx: leafRes.ctx,
      res: leafRes.res
    }));
  }

  if (nodeType === 'composite') {
    const composedNodes = graph[node].nodes;

    const childFn = ({method, ctx, params}) => {

      const compNodesRes = extractPromises(composedNodes.reduce((allRes, childNode) => {
        const addNode = rawRes => ({
          node: childNode,
          callRes: rawRes
        });
        const rawRes = callDispatch({
          node: childNode,
          ctx,
          method,
          params
        });
        const callRes = withResolved(rawRes, addNode);
        return [...allRes, callRes];
      }, []));

      const withCompNodeRes = (resolvedCompNodeRes) => {
        const allCompNodeRes = [
          ...resolvedCompNodeRes, 
          ...compNodesRes.notPromises
        ]
        .map(compNodeRes => ({
          ...compNodeRes.callRes,
          node: compNodeRes.node
        }))
        // merge composite results together (except the context)
        .reduce((soFar, nodeRes) => {
          // if the parent is like a:b, the child like a:b:c, then this is c
          const relativeChildNode = nodeRes.node.substr(node.length + 1);
          return {
            arrows: [...soFar.arrows, ...nodeRes.arrows],
            ctxs: [...soFar.ctxs, nodeRes.ctx],
            res: {...soFar.res, [relativeChildNode]: nodeRes.res}
          };
        }, {arrows: [], ctxs: [], res: undefined});
        return {
          arrows: addNodeToArrows(node, allCompNodeRes.arrows),
          res: allCompNodeRes.res,
          ctx: mergeCtxs(ctx, allCompNodeRes.ctxs)
        }
      };

      // there are some promises waiting to be resolved
      if (compNodesRes.promises.length > 0) {
        return Promise.all(compNodesRes.promises).then(withCompNodeRes);
      } else {
        return withCompNodeRes([]);
      }

    };

    return binding({method, ctx, params, child: childFn, node: nodeData});
  }

  if (nodeType === 'graph') {
    const activeChild = FSMState[node];
    const childFn = ({method, ctx, params}) => {
      const childRes = callDispatch({
        node: activeChild,
        ctx,
        method,
        params
      });

      return withResolved(childRes, childRes => ({
        ...childRes,
        arrows: addNodeToArrows(node, childRes.arrows)
      }));
    }

    return binding({method, ctx, params, child: childFn, node: nodeData});
  }
};

export default dispatch;