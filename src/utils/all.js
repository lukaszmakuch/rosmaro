import {lens, identity, keys, map} from 'ramda';

// prefix: a, node: x => a:x
// prefix: '', node: x => x
export const addPrefixToNode = (prefix, node) => {
  return prefix
    ? prefix + ":" + node
    : node;
};

export const extractParent = fullNodeName => {
  const lastSeparator = fullNodeName.lastIndexOf(':');
  if (lastSeparator === -1) return null;
  return fullNodeName.substr(0, lastSeparator);
};

export const extractLocalNodeName = fullNodeName => {
  const lastSeparator = fullNodeName.lastIndexOf(':');
  if (lastSeparator === -1) return fullNodeName;
  return fullNodeName.substr(lastSeparator + 1);
};

export const mapArrowTarget = mapFn => ({target, entryPoint}) => ({
  target: mapFn(target),
  entryPoint
});

export const mapArrows = srcNodeMapFn => arrowMapFn => existingArrows => allNodes => 
  allNodes.reduce((builtexistingArrows, srcNode) => ({
    ...builtexistingArrows,
    [srcNodeMapFn(srcNode)]: map(arrowMapFn, (existingArrows[srcNode] || {}))
  }), {});

export const identityLens = lens(identity, identity);

// falsey for [['a', undefined], ['c', undefined]]
// truthy for [['a', 'x'], ['c', undefined]]
export const nonEmptyArrow = arrow => arrow.some(([source, name]) => name != undefined)

export const removeUnusedFSMState = ({newFSMState, graph}) => {
  const minimalFSMState = Object.keys(graph).reduce((FSMState, node) => {
    const existingState = newFSMState[node];
    if (!existingState) return FSMState;
    return {
      ...FSMState,
      [node]: newFSMState[node]
    };
  }, {});
  return minimalFSMState;
};