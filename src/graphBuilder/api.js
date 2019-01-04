import {reduce, view, map, memoizeWith, identitiy} from 'ramda';
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
  builtSoFar = {graph: {}, handlers: {}, lenses: {}}
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

  const expandGraphChildren = () => graphPlan[planNode].nodes.forEach(
    planNode => expand({
      plan: {
        graph: graphPlan,
        bindings: bindingsPlan,
      },
      context,
      planNode,
      expandedParent: newFullNodeName,
      newLocalNodeName: extractLocalNodeName(planNode),
      builtSoFar
    }),
  );

  const expandCompositeChildren = expandGraphChildren;

  const expandDynamicCompositeChildren = () => {
    const children = (bindingsPlan[planNode].nodes || (() => []))({context});
    children.forEach(
      newLocalNodeName => expand({
        plan: {
          graph: graphPlan,
          bindings: bindingsPlan,
        },
        context,
        planNode: addPrefixToNode(planNode, 'child'),
        expandedParent: newFullNodeName,
        newLocalNodeName,
        builtSoFar,
      }),
    );
  };

  switch (type) {

    case 'leaf':
      builtSoFar.graph[newFullNodeName] = {type: 'leaf'};
      builtSoFar.handlers[newFullNodeName] = bindingsPlan[planNode].handler;
      builtSoFar.lenses[newFullNodeName] = lens;
    break;

    case 'graph':
      builtSoFar.graph[newFullNodeName] = {
        type: 'graph',
        nodes: getGraphChildrenList(),
        entryPoints: map(updateArrow(newFullNodeName), graphPlan[planNode].entryPoints),
        arrows: mapArrows(updateParentNode(newFullNodeName))(updateArrow(newFullNodeName))(graphPlan[planNode].arrows)(graphPlan[planNode].nodes),
      };
      builtSoFar.handlers[newFullNodeName] = bindingsPlan[planNode].handler;
      builtSoFar.lenses[newFullNodeName] = lens;
      expandGraphChildren();
    break;

    case 'composite':
      builtSoFar.graph[newFullNodeName] = {
        type: 'composite',
        nodes: getCompositeChildrenList()
      };
      builtSoFar.handlers[newFullNodeName] = bindingsPlan[planNode].handler;
      builtSoFar.lenses[newFullNodeName] = lens;
      expandCompositeChildren();
    break;

    case 'dynamicComposite':
      builtSoFar.graph[newFullNodeName] = {
        type: 'composite',
        nodes: getDynamicCompositeChildrenList()
      };
      builtSoFar.handlers[newFullNodeName] = bindingsPlan[planNode].handler;
      builtSoFar.lenses[newFullNodeName] = lens;
      expandDynamicCompositeChildren();
    break;

  }

  return builtSoFar;
};

export default expand;