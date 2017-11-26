/*
map like {a: 'b', b: 'c'}
arrows like [
  [['D:C:B', 'y'], ['C:B', 'y'], ['B', 'a']]
  [['C:B', 'y'], ['B', 'y']]
  [['B', 'b']]
]
res like [
  [['D:C:B', 'y'], ['C:B', 'y'], ['B', 'a'], ['', 'b']]
  [['C:B', 'y'], ['B', 'y']]
  [['B', 'b'], ['', 'c']]
]
*/
export const mapArrows = (map, arrows) => arrows.map(arrow => {
  const highest = arrow[arrow.length - 1];
  const newArrow = map[highest[1]];
  return newArrow
    ? [...arrow, ['', newArrow]]
    : arrow;
});

// ("A", ":", "B") => "A:B"
// ("A", ":", "") => "A"
export const prefixWithSeparator = (prefix, separator, string) => string
  ? prefix + separator + string
  : prefix;

// ("A", "") => "A"
// ("A", "B") => "A:B"
export const prefixNode = (prefix, node) => 
  prefixWithSeparator(prefix, ":", node);

// ("X", ":", {'': 1, 'A', 2}) => {'X' => 1, 'X:A' => 2}
export const prefixKeys = (prefix, separator, obj) => 
  Object.keys(obj).reduce((prefixed, key) => ({
    ...prefixed,
    [prefixNode(prefix, key)]: obj[key]
  }), {});

  // ("X", {'': 1, 'A', 2}) => {'X' => 1, 'X:A' => 2}
export const prefixNodeBindings = (prefix, bindings) =>
  prefixKeys(prefix, ":", bindings);

export const getSubGraph = (graph, node) => graph.nodes[node];

// "A:B:C" into ["A", "B", "C"]
// "" into []
export const splitNodePath = fullNodePath => fullNodePath
  ? fullNodePath.split(":")
  : [];