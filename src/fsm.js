import map from 'lodash/map';
import toPairs from 'lodash/toPairs';
import flatten from 'lodash/flatten';
import difference from 'lodash/difference';
import graphDiff from './graphDiff';

// [{'a': 'a:b'}, {'b': 'b:a'}] => {'a': 'a:b', 'b': 'b:a'}
const mergeNewFSMStates = FSMStates => {
  const parts = flatten(FSMStates.map(state => toPairs(state)));
  return parts.reduce((merged, [parent, children]) => {
    if (merged === 'fail') return 'fail';
    if (merged[parent] && (merged[parent] !== children)) return 'fail';

    return {...merged, [parent]: children};
  }, {});
};

export const initState = (graph, node = 'main', entryPoint = 'start') => {
  const nodeType = graph[node].type;

  if (nodeType === 'leaf') return {};

  if (nodeType === 'composite') {
    return graph[node].nodes.reduce((soFar, child) => ({
      ...soFar,
      ...initState(graph, child, entryPoint)
    }), {});
  }

  if (nodeType === 'graph') {
    const activeChild = graph[node].entryPoints[entryPoint];
    const graphState = {
      [node]: activeChild.target
    };
    const activeChildState = initState(
      graph, 
      activeChild.target, 
      activeChild.entryPoint
    );
    const otherChildren = difference(graph[node].nodes, [activeChild.target]);
    const otherChildrenState = otherChildren.reduce((soFar, child) => ({
      ...soFar,
      ...initState(
        graph,
        child,
        'start'
      )
    }), {});
    return {...graphState, ...activeChildState, ...otherChildrenState};
  } 
};

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

  // this arrow doesn't point at anything at this level, need to go up
  if (!arrowTarget) {
    const higherRes = followUp({
      arrow: higherArrows,
      graph
    });
    if (higherRes === "fail") return higherRes;

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
    if (newFSMState === 'fail') return newFSMState;

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
  if (allFollowedUp.some(res => res === 'fail')) return 'fail';

  const allFollowedDown = allFollowedUp.map(followTargetDown);
  const allNewFSMStates = [
    ...map(allFollowedUp, 'newFSMState'),
    ...map(allFollowedDown, 'newFSMState')
  ];
  const newFSMStatePart = mergeNewFSMStates(allNewFSMStates);
  if (newFSMStatePart === 'fail') return 'fail';

  const newFSMState = {...FSMState, ...newFSMStatePart};

  return {
    FSMState: newFSMState,
    ...graphDiff({graph, oldFSMState: FSMState, newFSMState})
  };
};