import reverse from 'lodash/reverse';

// children returned from the bottom to the top, from the left to the right
// res like ['a.a.a', 'a.a.b', 'a.a.c', 'a.a', 'a.b', 'a']
const nodesBottomTopLeftRight = ({graph, startNodes = ['main']}) => {
  if (startNodes.length === 0) return [];

  const children = startNodes.reduce((allChildren, parent) => [
    ...allChildren,
    ...graph[parent].nodes ? graph[parent].nodes : []
  ], []);
  return [
    ...nodesBottomTopLeftRight({graph, startNodes: children}),
    ...startNodes
  ];
};

// res like {a: {oldActive, newActive, oldActiveToRoot, newActiveToRoot}}
const nodeStatuses = ({
  graph, 
  oldFSMState, 
  newFSMState, 
  node = 'main',
  oldActive = true,
  newActive = true,
  oldActiveToRoot = true,
  newActiveToRoot = true
}) => {
  const nodeStatus = {
    [node]: {oldActive, newActive, oldActiveToRoot, newActiveToRoot}
  };

  if (graph[node].type === "leaf") return nodeStatus;

  if (graph[node].type === "graph") {
    const childrenStatuses = graph[node].nodes.reduce((statuses, child) => ({
      ...statuses,
      ...nodeStatuses({
        graph,
        oldFSMState,
        newFSMState,
        node: child,
        oldActive: oldFSMState[node] === child,
        newActive: newFSMState[node] === child,
        oldActiveToRoot: oldActiveToRoot && (oldFSMState[node] === child),
        newActiveToRoot: newActiveToRoot && (newFSMState[node] === child),
      })
    }), {});
    return {...nodeStatus, ...childrenStatuses};
  }

  if (graph[node].type === "composite") {
    const childrenStatuses = graph[node].nodes.reduce((statuses, child) => ({
      ...statuses,
      ...nodeStatuses({
        graph,
        oldFSMState,
        newFSMState,
        node: child,
        oldActive,
        newActive,
        oldActiveToRoot,
        newActiveToRoot,
      })
    }), {});
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

export default ({graph, oldFSMState, newFSMState}) => {
  const orderedNodes = nodesBottomTopLeftRight({graph});
  const statuses = nodeStatuses({graph, oldFSMState, newFSMState});
  const diff = orderedNodes.reduce((diff, node) => {
    const entered = isEntered(statuses[node]);
    const left = isLeft(statuses[node]);
    return {
      leftNodes: left ? [...diff.leftNodes, node] : diff.leftNodes,
      enteredNodes: entered ? [node, ...diff.enteredNodes] : diff.enteredNodes,
    };
  }, {leftNodes: [], enteredNodes: []})
  return diff;
}