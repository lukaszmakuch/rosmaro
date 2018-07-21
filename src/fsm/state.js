import {reduce, concat, without, toPairs} from 'ramda';

// [{'a': 'a:b'}, {'b': 'b:a'}] => {'a': 'a:b', 'b': 'b:a'}
export const mergeNewFSMStates = FSMStates => {
  const parts = reduce(concat, [], FSMStates.map(state => toPairs(state)));
  return parts.reduce((merged, [parent, children]) => {
    if (merged[parent] && (merged[parent] !== children)) 
      throw new Error("entering an incorrect FSM state");

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
    const otherChildren = without([activeChild.target], graph[node].nodes);
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