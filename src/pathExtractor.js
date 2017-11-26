// "A:B:C" into ["A", "B", "C"]
// "" into []
const splitNodePath = fullNodePath => fullNodePath
  ? fullNodePath.split(":")
  : [];

// A graph which only node is a leaf together with its (empty) FSM state.
const leafPath = {
  FSMState: {},
  graph: {type: 'leaf'}
};

// ("A", ":", "B") => "A:B"
// ("A", ":", "") => "A"
const prefixWithSeparator = (prefix, separator, string) => string
  ? prefix + separator + string
  : prefix;

// {'': 1, 'A', 2} => {'X' => 1, 'X:A' => 2}
const prefixKeys = (prefix, separator, obj) => 
  Object.keys(obj).reduce((prefixed, key) => ({
    ...prefixed,
    [prefixWithSeparator(prefix, ":", key)]: obj[key]
  }), {});

// for a graph example, check its unit test
// nodes like ["A", "B", "C"]
const extractRecursively = (
  graph,
  nodes
) => {
  // asking for the root
  if (nodes.length === 0) return leafPath;

  // the current node is a leaf
  if (graph.type === 'leaf') return leafPath;

  const [node, ...remainingNodes] = nodes;
  const subGraph = graph.nodes[node];
  const pathFromSubGraph = extractRecursively(subGraph, remainingNodes);
  const subGraphFSMState = prefixKeys(node, ":", pathFromSubGraph.FSMState);
  // handling a compound node depending on its type
  return ({
    graph: () => {
      const FSMState = {
        '': node,
        ...subGraphFSMState
      };
      return {
        graph: {
          type: 'graph',
          nodes: {
            [node]: pathFromSubGraph.graph
          }
        },
        FSMState
      }
    },

    composite: () => {
      return {
        graph: {
          type: 'composite',
          nodes: {
            [node]: pathFromSubGraph.graph
          }
        },
        FSMState: subGraphFSMState
      };
    }
  })[graph.type]();
};

export default (graph, targetNode) => extractRecursively(
  graph,
  splitNodePath(targetNode)
);