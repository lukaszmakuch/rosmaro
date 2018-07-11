import defaultParentHandler from './../handlers/transparent';
import {view as Rview, set as Rset} from 'ramda';

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
  const nodeData = {id: node};
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
    return handler({
      action, 
      ctx, 
      children: {}, 
      node: nodeData
    });
  }

  if (nodeType === 'composite') {
    const composedNodes = graph[node].nodes;

    const childrenFns = composedNodes.reduce((soFar, childNode) => ({
      ...soFar,
      [extractLocalNodeName(childNode)]: ({action}) => {
        return callDispatch({
          node: childNode,
          ctx,
          action
        });
      }
    }), {});

    return handler({action, ctx, children: childrenFns, node: nodeData});
  }

  if (nodeType === 'graph') {
    const activeChild = FSMState[node];
    const childFn = ({action}) => {
      return callDispatch({
        node: activeChild,
        ctx,
        action
      });
    };
    const childrenFns = {
      [extractLocalNodeName(activeChild)]: childFn
    };
    return handler({action, ctx, children: childrenFns, node: nodeData});
  }
};

export default dispatch;