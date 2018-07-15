import {map, keys, mergeDeepLeft, reduce} from 'ramda';
import {addPrefixToNode, mapArrowTarget, mapArrows} from './../utils/all';

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
  const prefixArrow = mapArrowTarget(prefixChildNode);

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
          arrows: mapArrows(prefixChildNode)(prefixArrow)(graphPlanDescription.arrows)(keys(graphPlanDescription.nodes)),
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