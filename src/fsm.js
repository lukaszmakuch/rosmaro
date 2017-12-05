import zip from 'lodash/zip';
import flatten from 'lodash/flatten';
import filter from 'lodash/filter';
import map from 'lodash/map';
import difference from 'lodash/difference';

// [{'a': 'a:b'}, {'b': 'b:a'}] => {'a': 'a:b', 'b': 'b:a'}
const mergeNewFSMStates = FSMStates => 
  FSMStates.reduce((merged, state) => ({...merged, ...state}), {});

const mergeNodes = (followed, nodes) => 
  filter(flatten(zip(...map(followed, nodes))));

// res {leftNodes: [], newFSMState: {}, target: 'a:b:c', entryPoint: 'p'}
const followUp = ({arrow, graph}) => {
  const noArrowToFollow = arrow.length === 0;
  if (noArrowToFollow) return "fail";

  // if arrow is [['a:b', 'x'], ['a', 'y']] then srcNode is 'a:b' and the arrowName is 'x'
  const [[srcNode, arrowName], ...higherArrows] = arrow;
  const leftNode = srcNode;
  const parent = graph[srcNode].parent;
  const arrowTarget = graph[parent].arrows[srcNode][arrowName];

  // this arrow doesn't point anything at this level, need to go up
  if (!arrowTarget) {
    const higherRes = followUp({
      arrow: higherArrows,
      graph
    });
    return {
      leftNodes: [leftNode, ...higherRes.leftNodes],
      newFSMState: higherRes.newFSMState,
      target: higherRes.target,
      entryPoint: higherRes.entryPoint
    };
  }

  // this arrow points to some node at this level
  const newFSMState = {[parent]: arrowTarget.target};
  return {
    leftNodes: [leftNode],
    newFSMState,
    ...arrowTarget
  };
};

const followDown = ({FSMState, graph, target, entryPoint}) => {
  const targetNode = graph[target];

  // the target is a leaf, no need to go deeper
  if (targetNode.type === 'leaf') return {
    newFSMState: {},
    enteredNodes: [target]
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
      },
      enteredNodes: [target, ...followedFromChild.enteredNodes]
    };
  }

  // if the target is a composite, need to do a split
  if (targetNode.type === 'composite') {
    const followedOrthogonal = targetNode.nodes
      .map(node => followDown({FSMState, graph, target: node, entryPoint}));
    const newFSMState = mergeNewFSMStates(map(followedOrthogonal, 'newFSMState'));
    const enteredNodes = [
      target, 
      ...flatten(zip(...map(followedOrthogonal, 'enteredNodes')))
    ];
    return {
      newFSMState,
      enteredNodes
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
  const newFSMState = mergeNewFSMStates(allNewFSMStates);

  const leftNodes = mergeNodes(allFollowedUp, 'leftNodes');
  const enteredNodes = mergeNodes(allFollowedDown, 'enteredNodes');
  return {
    FSMState: {...FSMState, ...newFSMState},
    leftNodes: difference(leftNodes, enteredNodes),
    enteredNodes: difference(enteredNodes, leftNodes)
  };
};