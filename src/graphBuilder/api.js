import {mergeDeepLeft, reduce, view, map} from 'ramda';
import {identityLens, addPrefixToNode, extractLocalNodeName, mapArrowTarget, mapArrows} from './../utils/all'

const expand = ({
  plan: {
    graph: graphPlan,
    bindings: bindingsPlan,
  },
  context: rawContext,
  planNode = 'main',
  expandedParent = null,
  newLocalNodeName = 'main',
}) => {
  const type = graphPlan[planNode].type;
  const lens = (bindingsPlan[planNode].lens || (() => identityLens));
  const newFullNodeName = addPrefixToNode(expandedParent, newLocalNodeName);
  const context = view(lens({localNodeName: newLocalNodeName}), rawContext);
  const updateParentNode = parent => node => addPrefixToNode(
    parent, 
    extractLocalNodeName(node)
  );
  const updateArrow = parent => mapArrowTarget(updateParentNode(parent));
  const isDynamicComposite = type === 'dynamicComposite';
  const getGraphChildrenList = () => map(updateParentNode(newFullNodeName), graphPlan[planNode].nodes);
  const getCompositeChildrenList = getGraphChildrenList;
  const getDynamicCompositeChildrenList = () => map (
    child => addPrefixToNode(newFullNodeName, child),
    (bindingsPlan[planNode].nodes || (() => []))({context})
  );

  const expandGraphChildren = () => map(
    planNode => expand({
      plan: {
        graph: graphPlan,
        bindings: bindingsPlan,
      },
      context,
      planNode,
      expandedParent: newFullNodeName,
      newLocalNodeName: extractLocalNodeName(planNode),
    }),
    graphPlan[planNode].nodes
  );

  const expandCompositeChildren = expandGraphChildren;

  const expandDynamicCompositeChildren = () => map(
    newLocalNodeName => expand({
      plan: {
        graph: graphPlan,
        bindings: bindingsPlan,
      },
      context,
      planNode: addPrefixToNode(planNode, 'child'),
      expandedParent: newFullNodeName,
      newLocalNodeName,
    }),
    (bindingsPlan[planNode].nodes || (() => []))({context})
  );

  switch (type) {

    case 'leaf':
      return {
        graph: {
          [newFullNodeName]: {
            type: 'leaf',
          }
        },
        handlers: {
          [newFullNodeName]: bindingsPlan[planNode].handler
        },
        lenses: {
          [newFullNodeName]: lens,
        },
      };
    break;

    case 'graph':
      return reduce(
        mergeDeepLeft,
        {
          graph: {
            [newFullNodeName]: {
              type: 'graph',
              nodes: getGraphChildrenList(),
              entryPoints: map(updateArrow(newFullNodeName), graphPlan[planNode].entryPoints),
              arrows: mapArrows(updateParentNode(newFullNodeName))(updateArrow(newFullNodeName))(graphPlan[planNode].arrows)(graphPlan[planNode].nodes),
            }
          },
          handlers: {
            [newFullNodeName]: bindingsPlan[planNode].handler
          },
          lenses: {
            [newFullNodeName]: lens,
          },
        },
        expandGraphChildren()
      );
    break;

    case 'composite':
      return reduce(
        mergeDeepLeft,
        {
          graph: {
            [newFullNodeName]: {
              type: 'composite',
              nodes: getCompositeChildrenList()
            }
          },
          handlers: {
            [newFullNodeName]: bindingsPlan[planNode].handler
          },
          lenses: {
            [newFullNodeName]: lens,
          },
        },
        expandCompositeChildren()
      );
    break;

    case 'dynamicComposite':
      return reduce(
        mergeDeepLeft,
        {
          graph: {
            [newFullNodeName]: {
              type: 'composite',
              nodes: getDynamicCompositeChildrenList()
            }
          },
          handlers: {
            [newFullNodeName]: bindingsPlan[planNode].handler
          },
          lenses: {
            [newFullNodeName]: lens,
          },
        },
        expandDynamicCompositeChildren()
      );
    break;

  }

};

export default expand;