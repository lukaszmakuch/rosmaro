import defaultParentHandler from './../handlers/transparent';
import {mergeCtxs} from './ctx';
import {view as Rview, set as Rset} from 'ramda';

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

const dummyChildFn = ({ctx}) => ({
  arrows: [[[null, undefined]]],
  ctx: ctx,
  res: undefined
});

const extractLocalNodeName = fullNodeName => {
  const lastSeparator = fullNodeName.lastIndexOf(':');
  if (lastSeparator === -1) return fullNodeName;
  return fullNodeName.substr(lastSeparator + 1);
};

const dispatch = ({
  graph, 
  node = 'main',
  FSMState, 
  handlers, 
  ctx: rawCtx, 
  action,
  lenses
}) => {
  const localNodeName = extractLocalNodeName(node);
  const nodeLens = lenses[node]({localNodeName});
  const ctx = Rview(nodeLens, rawCtx)
  const mapReturnedCtx = callRes => ({
    ...callRes,
    ctx: Rset(nodeLens, callRes.ctx, rawCtx)
  });
  const handler = opts => mapReturnedCtx(
    (handlers[node] || defaultParentHandler)(opts)
  );
  const nodeType = graph[node].type;
  const nodeData = {ID: node};
  const callDispatch = ({node, ctx, action}) => dispatch({
    graph,
    node,
    FSMState,
    handlers,
    ctx,
    action,
    lenses
  });

  if (nodeType === 'leaf') {
    const leafRes = handler({
      action, 
      ctx, 
      children: {}, 
      node: nodeData
    });
    return {
      arrows: leafRes.arrows
        ? [[[node, leafRes.arrows[0][0][1]]]]
        : [[[node, undefined]]],
      ctx: leafRes.ctx,
      res: leafRes.res
    };
  }

  if (nodeType === 'composite') {
    const composedNodes = graph[node].nodes;

    // const childFn = ({action}) => {

    //   const compNodesRes = composedNodes.reduce((allRes, childNode) => {
    //     const addNode = rawRes => ({
    //       node: childNode,
    //       callRes: rawRes
    //     });
    //     const callRes = addNode(callDispatch({
    //       node: childNode,
    //       ctx,
    //       action
    //     }));
    //     return [...allRes, callRes];
    //   }, [])
    //   .map(res => ({
    //     ...res.callRes,
    //     node: res.node
    //   }))
    //   // merge composite results together (except the context)
    //   .reduce((soFar, nodeRes) => {
    //     // if the parent is like a:b, the child like a:b:c, then this is c
    //     const relativeChildNode = nodeRes.node.substr(node.length + 1);
    //     return {
    //       arrows: [...soFar.arrows, ...nodeRes.arrows],
    //       ctxs: [...soFar.ctxs, nodeRes.ctx],
    //       res: {...soFar.res, [relativeChildNode]: nodeRes.res}
    //     };
    //   }, {arrows: [], ctxs: [], res: {}});
      
    //   return {
    //     arrows: addNodeToArrows(node, compNodesRes.arrows),
    //     res: compNodesRes.res,
    //     ctx: mergeCtxs(ctx, compNodesRes.ctxs)
    //   }

    // };

    const childrenFns = composedNodes.reduce((soFar, childNode) => ({
      ...soFar,
      [extractLocalNodeName(childNode)]: ({action}) => {
        const childRes = callDispatch({
          node: childNode,
          ctx,
          action
        });
        return {
          ...childRes,
          arrows: addNodeToArrows(node, childRes.arrows)
        };
      }
    }), {});

    return handler({action, ctx, children: childrenFns, node: nodeData});
  }

  if (nodeType === 'graph') {
    const activeChild = FSMState[node];
    const childFn = ({action}) => {
      const childRes = callDispatch({
        node: activeChild,
        ctx,
        action
      });
      return {
        ...childRes,
        arrows: addNodeToArrows(node, childRes.arrows)
      };
    };
    const childrenFns = {
      [extractLocalNodeName(activeChild)]: childFn
    };
    return handler({action, ctx, children: childrenFns, node: nodeData});
  }
};

export default dispatch;