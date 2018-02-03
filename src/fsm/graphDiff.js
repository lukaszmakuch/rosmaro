/*
For a detailed example please check test/graphDiff.js.
*/
import uniq from 'lodash/uniq';

// children returned from the bottom to the top, from the left to the right
// res like ['a.a.a', 'a.a.b', 'a.a.c', 'a.a', 'a.b', 'a']
const nodesBottomTopLeftRight = ({newGraph, oldGraph, startNodes = ['main']}) => {
  if (startNodes.length === 0) return [];

  const children = startNodes.reduce((allChildren, parent) => [
    ...allChildren,
    ...uniq([
      ...(oldGraph[parent] && oldGraph[parent].nodes) ? oldGraph[parent].nodes : [],
      ...(newGraph[parent] && newGraph[parent].nodes) ? newGraph[parent].nodes : [],
    ])
  ], []);
  return [
    ...nodesBottomTopLeftRight({oldGraph, newGraph, startNodes: children}),
    ...startNodes
  ];
};

const presence = ({parent, child, newGraph, oldGraph}) => ({
  wasPresent: oldGraph[parent] && oldGraph[parent].nodes.includes(child),
  isPresent: newGraph[parent] && newGraph[parent].nodes.includes(child),
});

const mergeNodeDefs = ({defA, defB}) => {
  const aHasNoChildren = defA && defA.nodes === undefined;
  const bHasNoChildren = defB && defB.nodes === undefined;

  const anyDef = defA || defB;

  if (aHasNoChildren || bHasNoChildren) {
    // nothing to merge
    return anyDef;
  }

  const aChildren = (defA || {}).nodes || [];
  const bChildren = (defB || {}).nodes || [];

  return {
    ...anyDef,
    nodes: uniq([...aChildren, ...bChildren])
  };
};

/*
res like {
  node: {oldActive, newActive, oldActiveToRoot, newActiveToRoot},
  ...
}
*/
const nodeStatuses = ({
  oldGraph,
  newGraph, 
  oldFSMState, 
  newFSMState = {}, 
  node = 'main',
  oldActive = true,
  newActive,
  oldActiveToRoot = true,
  newActiveToRoot
}) => {
  const nodeDef = mergeNodeDefs({defA: oldGraph[node], defB: newGraph[node]});

  const nodeStatus = {
    [node]: {oldActive, newActive, oldActiveToRoot, newActiveToRoot}
  };

  if (nodeDef.type === "leaf") return nodeStatus;

  if (nodeDef.type === "graph") {
    const childrenStatuses = nodeDef.nodes.reduce((statuses, child) => {

      const {wasPresent, isPresent} = presence({parent: node, child, newGraph, oldGraph});

      const wasActive = wasPresent && (oldFSMState[node] === child);
      const isActive = isPresent && (newFSMState[node] === child);

      return {
        ...statuses,
        ...nodeStatuses({
          oldGraph,
          newGraph,
          oldFSMState,
          newFSMState,
          node: child,
          oldActive: wasActive,
          newActive: isActive,
          oldActiveToRoot: oldActiveToRoot && wasActive,
          newActiveToRoot: newActiveToRoot && isActive,
        })
      };
    }, {});
    return {...nodeStatus, ...childrenStatuses};
  }

  if (nodeDef.type === "composite") {
    const childrenStatuses = nodeDef.nodes.reduce((statuses, child) => {

      const {wasPresent, isPresent} = presence({parent: node, child, newGraph, oldGraph});

      return {
        ...statuses,
        ...nodeStatuses({
          oldGraph,
          newGraph,
          oldFSMState,
          newFSMState,
          node: child,
          oldActive: wasPresent && oldActive,
          newActive: isPresent && newActive,
          oldActiveToRoot: wasPresent && oldActiveToRoot,
          newActiveToRoot: isPresent && newActiveToRoot,
        })
      };
    }, {});
    return {...nodeStatus, ...childrenStatuses};
  }

}

// s - node status like {oldActive, newActive, oldActiveToRoot, newActiveToRoot}
const isEntered = s => (
  (!s.oldActive && !s.oldActiveToRoot && s.newActive && s.newActiveToRoot)
  || (!s.oldActive && !s.oldActiveToRoot && s.newActive && !s.newActiveToRoot)
  || (s.oldActive && !s.oldActiveToRoot && s.newActive && s.newActiveToRoot)
);

// s - node status like {oldActive, newActive, oldActiveToRoot, newActiveToRoot}
const isLeft = s => (
  (s.oldActive && s.oldActiveToRoot && !s.newActive && !s.newActiveToRoot)
  || (s.oldActive && s.oldActiveToRoot && s.newActive && !s.newActiveToRoot)
  || (!s.oldActive && !s.oldActiveToRoot && s.newActive && !s.newActiveToRoot)
);

// res like {leftNodes: ['main:A:A'], enteredNodes: ['main:A:B']}
export default ({oldGraph, newGraph, oldFSMState, newFSMState}) => {
  const orderedNodes = nodesBottomTopLeftRight({
    newGraph: newGraph || {}, 
    oldGraph
  });
  const newMainActive = newFSMState != undefined;
  const statuses = nodeStatuses({
    oldGraph,
    newGraph: newGraph || {}, 
    oldFSMState, 
    newFSMState: newFSMState || {},
    newActive: newMainActive,
    newActiveToRoot: newMainActive
  });

  const diff = orderedNodes.reduce((diff, node) => {
    const entered = isEntered(statuses[node]);
    const left = isLeft(statuses[node]);
    return {
      leftNodes: left ? [...diff.leftNodes, node] : diff.leftNodes,
      enteredNodes: entered ? [node, ...diff.enteredNodes] : diff.enteredNodes,
    };
  }, {leftNodes: [], enteredNodes: []})
  return diff;
};