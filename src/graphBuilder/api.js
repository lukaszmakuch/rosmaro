import {mergeDeepLeft, reduce, view, map} from 'ramda';
import {identityLens, addPrefixToNode, extractLocalNodeName, mapArrowTarget, mapArrows} from './../utils/all'

const expand = ({
  plan: {
    graph: graphPlan,
    handlers: handlersPlan,
  },
  ctx: rawCtx,
  planNode = 'main',
  expandedParent = null,
  newLocalNodeName = 'main',
}) => {
  const type = graphPlan[planNode].type;
  const lens = (handlersPlan[planNode].lens || (() => identityLens));
  const newFullNodeName = addPrefixToNode(expandedParent, newLocalNodeName);
  const ctx = view(lens({localNodeName: newLocalNodeName}), rawCtx);
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
    (handlersPlan[planNode].nodes || (() => []))({ctx})
  );

  const expandGraphChildren = () => map(
    planNode => expand({
      plan: {
        graph: graphPlan,
        handlers: handlersPlan,
      },
      ctx,
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
        handlers: handlersPlan,
      },
      ctx,
      planNode: addPrefixToNode(planNode, 'child'),
      expandedParent: newFullNodeName,
      newLocalNodeName,
    }),
    (handlersPlan[planNode].nodes || (() => []))({ctx})
  );

  switch (type) {

    case 'leaf':
      return {
        graph: {
          [newFullNodeName]: {
            type: 'leaf',
            parent: expandedParent,
          }
        },
        handlers: {
          [newFullNodeName]: handlersPlan[planNode].handler
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
              parent: expandedParent,
              nodes: getGraphChildrenList(),
              entryPoints: map(updateArrow(newFullNodeName), graphPlan[planNode].entryPoints),
              arrows: mapArrows(updateParentNode(newFullNodeName))(updateArrow(newFullNodeName))(graphPlan[planNode].arrows)(graphPlan[planNode].nodes),
            }
          },
          handlers: {
            [newFullNodeName]: handlersPlan[planNode].handler
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
              parent: expandedParent,
              nodes: getCompositeChildrenList()
            }
          },
          handlers: {
            [newFullNodeName]: handlersPlan[planNode].handler
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
              parent: expandedParent,
              nodes: getDynamicCompositeChildrenList()
            }
          },
          handlers: {
            [newFullNodeName]: handlersPlan[planNode].handler
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