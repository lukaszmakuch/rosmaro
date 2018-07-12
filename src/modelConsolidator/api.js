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

  // graph specific
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
        {
          graph: {
            [prefixNode(newNodeName)]: {
              type: 'dynamicComposite',
              parent,
            }
          },
          handlers: {
            [prefixNode(newNodeName)]: handlersPlan[nodeFromPlan]
          }
        },
        consolidate({
          graph: graphPlan,
          handlers: handlersPlan,
          nodePrefix: prefixNode(newNodeName),
          nodeFromPlan: graphPlanDescription.nodeTemplate,
          newNodeName: 'template',
        })
      );
    break;

    case 'composite':
      return reduce(
        mergeDeepLeft, 
        {
          graph: {
            [prefixNode(newNodeName)]: {
              type: 'composite',
              parent,
              nodes: map(prefixChildNode, keys(graphPlanDescription.nodes)),
            }
          },
          handlers: {
            [prefixNode(newNodeName)]: handlersPlan[nodeFromPlan]
          }
        },
        keys(graphPlanDescription.nodes).map(child => consolidate({
          graph: graphPlan,
          handlers: handlersPlan,
          nodePrefix: prefixNode(newNodeName),
          nodeFromPlan: graphPlanDescription.nodes[child],
          newNodeName: child
        }))
      );
    break;

    case 'leaf': 
      return {
        graph: {
          [prefixNode(newNodeName)]: {
            type: 'leaf',
            parent
          }
        },
        handlers: {
          [prefixNode(newNodeName)]: handlersPlan[nodeFromPlan]
        }
      };
    break;

    case 'graph':
      return reduce(
        mergeDeepLeft, 
        {
          graph: {
            [prefixNode(newNodeName)]: {
              type: 'graph',
              parent,
              nodes: map(prefixChildNode, keys(graphPlanDescription.nodes)),
              arrows: keys(graphPlanDescription.nodes).reduce((builtArrows, srcNode) => ({
                ...builtArrows,
                // TODO: consider removing the duplication of prefixChildNode(srcNode)
                [prefixChildNode(srcNode)]: map(prefixArrow, (graphPlanDescription.arrows[srcNode] || {}))
              }), {}),
              entryPoints: map(prefixArrow, graphPlanDescription.entryPoints)
            }
          },
          handlers: {
            [prefixNode(newNodeName)]: handlersPlan[nodeFromPlan]
          }
        },
        keys(graphPlanDescription.nodes).map(child => consolidate({
          graph: graphPlan,
          handlers: handlersPlan,
          nodePrefix: prefixNode(newNodeName),
          nodeFromPlan: graphPlanDescription.nodes[child],
          newNodeName: child
        }))
      );
    break;

  }

};

export default consolidate;