import {map, keys, mergeDeepLeft, reduce} from 'ramda';

// prefix: a, node: x => a:x
// prefix: '', node: x => x
const addPrefixToNode = (prefix, node) => {
  return prefix
    ? prefix + ":" + node
    : node;
};

const consolidate = ({
  graph: graphPlan,
  handlers: handlersPlan,
  nodePrefix = '',
  nodeFromPlan = 'main',
  newNodeName = 'main'
}) => {
  const parent = nodePrefix || null;
  const graphPlanDescription = graphPlan[nodeFromPlan];
  const handlersPlanDescription = handlersPlan[nodeFromPlan];
  const prefixNode = node => addPrefixToNode(nodePrefix, node);
  const prefixChildNode = child => addPrefixToNode(addPrefixToNode(nodePrefix, newNodeName), child);
  const currentNodeFullName = prefixNode(newNodeName);
  const currentNodeHandlers = {
    [currentNodeFullName]: handlersPlan[nodeFromPlan]
  };
  const singleNode = node => ({
    graph: {
      [currentNodeFullName]: node
    },
    handlers: {
      [currentNodeFullName]: handlersPlan[nodeFromPlan]
    }
  })
  const prefixArrow = ({target, entryPoint}) => ({
    target: prefixChildNode(target),
    entryPoint
  });

  switch (graphPlanDescription.type) {

    case 'external':
      return consolidate({
        graph: handlersPlanDescription.graph,
        handlers: handlersPlanDescription.handlers,
        nodePrefix: nodePrefix,
        nodeFromPlan: 'main',
        newNodeName: newNodeName,
      })
    break;

    case 'dynamicComposite':
      return mergeDeepLeft( 
        singleNode({
          type: 'dynamicComposite',
          parent,
        }),
        consolidate({
          graph: graphPlan,
          handlers: handlersPlan,
          nodePrefix: currentNodeFullName,
          nodeFromPlan: graphPlanDescription.nodeTemplate,
          newNodeName: 'template',
        })
      );
    break;

    case 'composite':
      return reduce(
        mergeDeepLeft,
        singleNode({
          type: 'composite',
          parent,
          nodes: map(prefixChildNode, keys(graphPlanDescription.nodes)),
        }),
        keys(graphPlanDescription.nodes).map(child => consolidate({
          graph: graphPlan,
          handlers: handlersPlan,
          nodePrefix: currentNodeFullName,
          nodeFromPlan: graphPlanDescription.nodes[child],
          newNodeName: child
        }))
      );
    break;

    case 'leaf': 
    return singleNode({type: 'leaf', parent});
    break;

    case 'graph':
      return reduce(
        mergeDeepLeft, 
        singleNode({
          type: 'graph',
          parent,
          nodes: map(prefixChildNode, keys(graphPlanDescription.nodes)),
          arrows: keys(graphPlanDescription.nodes).reduce((builtArrows, srcNode) => ({
            ...builtArrows,
            [prefixChildNode(srcNode)]: map(prefixArrow, (graphPlanDescription.arrows[srcNode] || {}))
          }), {}),
          entryPoints: map(prefixArrow, graphPlanDescription.entryPoints)
        }),
        keys(graphPlanDescription.nodes).map(child => consolidate({
          graph: graphPlan,
          handlers: handlersPlan,
          nodePrefix: currentNodeFullName,
          nodeFromPlan: graphPlanDescription.nodes[child],
          newNodeName: child
        }))
      );
    break;

  }

};

export default consolidate;