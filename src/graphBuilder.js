const glueNodeName = (parent, child) => parent
  ? parent + ":" + child
  : child;

const build = (
  graphPlan, 
  planNode = 'main',
  builtNode = 'main',
  parent = null
) => {

  const nodePlan = graphPlan[planNode];
  const type = nodePlan.type;

  if (type === 'leaf') {
    return {
      [builtNode]: {
        type: 'leaf',
        parent
      }
    };
  }

  if (type === 'composite') {
    const childRes = Object.keys(nodePlan.nodes).reduce((soFar, planName) => {
      const builtName = glueNodeName(builtNode, planName);
      const builtGraph = build(
        graphPlan, 
        nodePlan.nodes[planName],
        builtName,
        builtNode
      );
      return {
        nodes: [...soFar.nodes, builtName],
        graph: {...soFar.graph, ...builtGraph}
      };
    }, {nodes: [], graph: {}});

    return {
      [builtNode]: {
        nodes: childRes.nodes,
        type: 'composite',
        parent
      },
      ...childRes.graph
    }
  }

  if (type === 'graph') {
    const childRes = Object.keys(nodePlan.nodes).reduce((soFar, planName) => {
      const builtName = glueNodeName(builtNode, planName);
      const builtGraph = build(
        graphPlan, 
        nodePlan.nodes[planName],
        builtName,
        builtNode
      );
      return {
        nodes: [...soFar.nodes, builtName],
        graph: {...soFar.graph, ...builtGraph}
      };
    }, {nodes: [], graph: {}});

    const emptyArrows = childRes.nodes.reduce((soFar, node) => ({
      ...soFar,
      [node]: {}
    }), {});

    const arrows = Object.keys(nodePlan.arrows).reduce((allArrows, srcNode) => {
      const nodeArrowsPlan = nodePlan.arrows[srcNode];
      const nodeArrows = Object.keys(nodeArrowsPlan).reduce((nodeArrows, arrow) => {
        const arrowPlan = nodeArrowsPlan[arrow];
        return {
          ...nodeArrows,
          [arrow]: {
            target: glueNodeName(builtNode, arrowPlan.target),
            entryPoint: arrowPlan.entryPoint
          }
        }
      }, {});
      return {
        ...allArrows,
        [glueNodeName(builtNode, srcNode)]: nodeArrows
      };
    }, {});
    const entryPoints = Object.keys(nodePlan.entryPoints).reduce((entryPoints, point) => {
      return {
        ...entryPoints,
        [point]: {
          target: glueNodeName(builtNode, nodePlan.entryPoints[point].target),
          entryPoint: nodePlan.entryPoints[point].entryPoint
        }
      };
    }, {});

    return {
      [builtNode]: {
        type: 'graph',
        parent,
        arrows: {...emptyArrows, ...arrows},
        entryPoints,
        nodes: childRes.nodes
      },
      ...childRes.graph
    };
  }

};

export default build;