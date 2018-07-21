import {map, keys, mergeDeepLeft, reduce} from 'ramda';
import {addPrefixToNode, mapArrowTarget, mapArrows} from './../utils/all';

const consolidate = ({
  graph: graphPlan,
  bindings: bindingsPlan,
  nodePrefix = '',
  fullPathToNodeFromPlan = 'main',
  nodeFromPlan = 'main',
  newNodeName = 'main'
}) => {
  const parent = nodePrefix || null;
  const graphPlanDescription = graphPlan[nodeFromPlan];
  const prefixNode = node => addPrefixToNode(nodePrefix, node);
  const prefixChildNode = child => addPrefixToNode(addPrefixToNode(nodePrefix, newNodeName), child);
  const currentNodeFullName = prefixNode(newNodeName);
  const bindingsPlanDescription = bindingsPlan[fullPathToNodeFromPlan];
  const singleNode = node => ({
    graph: {
      [currentNodeFullName]: node
    },
    bindings: {
      [currentNodeFullName]: bindingsPlan[fullPathToNodeFromPlan]
    }
  })
  const prefixArrow = mapArrowTarget(prefixChildNode);
  switch (graphPlanDescription.type) {

    case 'external':
      return consolidate({
        graph: bindingsPlanDescription.graph,
        bindings: bindingsPlanDescription.bindings,
        nodePrefix: nodePrefix,
        nodeFromPlan: 'main',
        newNodeName: newNodeName,
        fullPathToNodeFromPlan: 'main',
      })
    break;

    case 'dynamicComposite':
      return mergeDeepLeft(
        singleNode({
          type: 'dynamicComposite',
        }),
        consolidate({
          graph: graphPlan,
          bindings: bindingsPlan,
          nodePrefix: currentNodeFullName,
          nodeFromPlan: graphPlanDescription.child,
          newNodeName: 'child',
          fullPathToNodeFromPlan: addPrefixToNode(fullPathToNodeFromPlan, 'child'),
        })
      );
    break;

    case 'composite':
      return reduce(
        mergeDeepLeft,
        singleNode({
          type: 'composite',
          nodes: map(prefixChildNode, keys(graphPlanDescription.nodes)),
        }),
        keys(graphPlanDescription.nodes).map(child => consolidate({
          graph: graphPlan,
          bindings: bindingsPlan,
          nodePrefix: currentNodeFullName,
          nodeFromPlan: graphPlanDescription.nodes[child],
          newNodeName: child,
          fullPathToNodeFromPlan: addPrefixToNode(fullPathToNodeFromPlan, child),
        }))
      );
    break;

    case 'leaf': 
      return singleNode({type: 'leaf'});
    break;

    case 'graph':
      return reduce(
        mergeDeepLeft, 
        singleNode({
          type: 'graph',
          nodes: map(prefixChildNode, keys(graphPlanDescription.nodes)),
          arrows: mapArrows(prefixChildNode)(prefixArrow)(graphPlanDescription.arrows)(keys(graphPlanDescription.nodes)),
          entryPoints: map(prefixArrow, graphPlanDescription.entryPoints)
        }),
        keys(graphPlanDescription.nodes).map(child => consolidate({
          graph: graphPlan,
          bindings: bindingsPlan,
          nodePrefix: currentNodeFullName,
          nodeFromPlan: graphPlanDescription.nodes[child],
          newNodeName: child,
          fullPathToNodeFromPlan: addPrefixToNode(fullPathToNodeFromPlan, child),
        }))
      );
    break;

  }

};

export default consolidate;