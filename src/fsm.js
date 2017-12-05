import map from 'lodash/map';
import graphDiff from './graphDiff';

// [{'a': 'a:b'}, {'b': 'b:a'}] => {'a': 'a:b', 'b': 'b:a'}
const mergeNewFSMStates = FSMStates => 
  FSMStates.reduce((merged, state) => ({...merged, ...state}), {});

// res {newFSMState: {}, target: 'a:b:c', entryPoint: 'p'}
const followUp = ({arrow, graph}) => {
  const noArrowToFollow = arrow.length === 0;
  if (noArrowToFollow) return "fail";

  // if arrow is [['a:b', 'x'], ['a', 'y']] then srcNode is 'a:b' and the arrowName is 'x'
  const [[srcNode, arrowName], ...higherArrows] = arrow;
  const parent = graph[srcNode].parent;
  const parentIsGraph = graph[parent].type === "graph";
  // only a graph may have arrows
  const arrowTarget = parentIsGraph && graph[parent].arrows[srcNode][arrowName];

  // this arrow doesn't point anything at this level, need to go up
  if (!arrowTarget) {
    const higherRes = followUp({
      arrow: higherArrows,
      graph
    });
    return {
      newFSMState: higherRes.newFSMState,
      target: higherRes.target,
      entryPoint: higherRes.entryPoint
    };
  }

  // this arrow points to some node at this level
  const newFSMState = {[parent]: arrowTarget.target};
  return {
    newFSMState,
    ...arrowTarget
  };
};

const followDown = ({FSMState, graph, target, entryPoint}) => {
  const targetNode = graph[target];

  // the target is a leaf, no need to go deeper
  if (targetNode.type === 'leaf') return {
    newFSMState: {}
  }

  // the target is a graph, need to go the specified entry point
  if (targetNode.type === 'graph') {
    const pickedGraphChild = targetNode.entryPoints[entryPoint].target == 'recent'
      ? {
        target: FSMState[target],
        entryPoint: targetNode.entryPoints[entryPoint].entryPoint
      }
      : targetNode.entryPoints[entryPoint];

    const followedFromChild = followDown({
      FSMState,
      graph,
      ...pickedGraphChild
    });
    return {
      newFSMState: {
        [target]: pickedGraphChild.target,
        ...followedFromChild.newFSMState
      }
    };
  }

  // if the target is a composite, need to do a split
  if (targetNode.type === 'composite') {
    const followedOrthogonal = targetNode.nodes
      .map(node => followDown({FSMState, graph, target: node, entryPoint}));
    const newFSMState = mergeNewFSMStates(map(followedOrthogonal, 'newFSMState'));
    return {
      newFSMState
    };
  }

};

// res: {FSMState, leftNodes, enteredNodes}
export default ({
  graph, 
  FSMState, 
  arrows
}) => {
  const followArrowUp = arrow => followUp({arrow, graph});
  const followTargetDown = ({target, entryPoint}) => 
    followDown({FSMState, graph, target, entryPoint});

  const allFollowedUp = arrows.map(followArrowUp);
  const allFollowedDown = allFollowedUp.map(followTargetDown);
  const allNewFSMStates = [
    ...map(allFollowedUp, 'newFSMState'),
    ...map(allFollowedDown, 'newFSMState')
  ];
  const newFSMState = {...FSMState, ...mergeNewFSMStates(allNewFSMStates)};

  return {
    FSMState: newFSMState,
    ...graphDiff({graph, oldFSMState: FSMState, newFSMState})
  };
};