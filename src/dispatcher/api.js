import {view as Rview, set as Rset} from 'ramda';
import {extractLocalNodeName} from './../utils/all';

const dispatch = ({
  graph, 
  node = 'main',
  FSMState, 
  handlers, 
  context: rawContext, 
  action,
  lenses
}) => {
  const localNodeName = extractLocalNodeName(node);
  const nodeLens = lenses[node]({localNodeName});
  const context = Rview(nodeLens, rawContext)
  const mapReturnedContext = callRes => ({
    ...callRes,
    context: Rset(nodeLens, callRes.context, rawContext)
  });
  const handler = opts => mapReturnedContext(
    handlers[node](opts)
  );
  const nodeType = graph[node].type;
  const nodeData = {id: node};
  const callDispatch = ({node, context, action}) => dispatch({
    graph,
    node,
    FSMState,
    handlers,
    context,
    action,
    lenses
  });

  if (nodeType === 'leaf') {
    return handler({
      action, 
      context, 
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
          context,
          action
        });
      }
    }), {});

    return handler({action, context, children: childrenFns, node: nodeData});
  }

  if (nodeType === 'graph') {
    const activeChild = FSMState[node];
    const childFn = ({action}) => {
      return callDispatch({
        node: activeChild,
        context,
        action
      });
    };
    const childrenFns = {
      [extractLocalNodeName(activeChild)]: childFn
    };
    return handler({action, context, children: childrenFns, node: nodeData});
  }
};

export default dispatch;