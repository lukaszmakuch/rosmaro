import {splitNodePath, prefixNodeBindings, getSubGraph} from './utils';

// A graph which only node is a leaf together with its (empty) FSM state.
const leafPath = {
  FSMState: {},
  graph: {type: 'leaf'}
};

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
  const subGraph = getSubGraph(graph, node);
  const pathFromSubGraph = extractRecursively(subGraph, remainingNodes);
  const subGraphFSMState = prefixNodeBindings(node, pathFromSubGraph.FSMState);
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