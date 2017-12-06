const mergeExtracts = (a, b) => ({
  graph: {...a.graph, ...b.graph},
  FSMState: {...a.FSMState, ...b.FSMState}
});

const extract = (graph, targetNode, child) => {

  //we cannot go higher
  if (!targetNode) return {FSMState: {}, graph: {}};

  //we're visiting some compound node
  if (child) {
    const targetExtract = {
      FSMState: graph[targetNode].type === 'graph'
        ? {[targetNode]: child}
        : {},
      graph: {
        [targetNode]: {
          ...graph[targetNode],
          nodes: [child]
        }
      }
    };
    const higherExtracts = extract(graph, graph[targetNode].parent, targetNode);
    return mergeExtracts(targetExtract, higherExtracts);
  }

  //we're at the bottom
  if (!child) {
    const targetExtract = {
      FSMState: {},
      graph: {
        [targetNode]: {type: 'leaf', parent: graph[targetNode].parent}
      }
    };
    const higherExtracts = extract(graph, graph[targetNode].parent, targetNode);
    return mergeExtracts(targetExtract, higherExtracts);
  }

};

export default extract;