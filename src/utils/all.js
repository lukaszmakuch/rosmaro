import {lens, identity, keys, map} from 'ramda';

// prefix: a, node: x => a:x
// prefix: '', node: x => x
export const addPrefixToNode = (prefix, node) => {
  return prefix
    ? prefix + ":" + node
    : node;
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

export const mapArrows = srcNodeMapFn => arrowMapFn => arrows => 
  keys(arrows).reduce((builtArrows, srcNode) => ({
    ...builtArrows,
    [srcNodeMapFn(srcNode)]: map(arrowMapFn, (arrows[srcNode]))
  }), {});

  export const identityLens = lens(identity, identity);