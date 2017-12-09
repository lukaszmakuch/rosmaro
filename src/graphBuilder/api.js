import {renameMain, glueNodeName} from './nodeNames';
import {mapMain} from './handlers';
import transparentHandler from './../handlers/transparent';
export {mapMain};

const build = (
  plan,
  planNode = 'main',
  builtNode = 'main',
  parent = null
) => {
  const nodePlan = plan.graph[planNode];
  const type = nodePlan.type;
  const handler = plan.handlers[planNode] || transparentHandler;
  const externalPlan = (plan.external || {})[planNode];

  if (type === 'external') {
    return renameMain(build(externalPlan), builtNode, parent);
  }

  if (type === 'leaf') {
    return {
      graph: {
        [builtNode]: {
          type: 'leaf',
          parent
        }
      },
      handlers: {
        [builtNode]: handler
      }
    };
  }

  if (type === 'composite') {
    const childRes = Object.keys(nodePlan.nodes).reduce((soFar, planName) => {
      const builtName = glueNodeName(builtNode, planName);
      const built = build(
        plan, 
        nodePlan.nodes[planName],
        builtName,
        builtNode
      );
      return {
        nodes: [...soFar.nodes, builtName],
        graph: {...soFar.graph, ...built.graph},
        handlers: {...soFar.handlers, ...built.handlers}
      };
    }, {nodes: [], graph: {}, handlers: {}});

    return {
      graph: {
        [builtNode]: {
          nodes: childRes.nodes,
          type: 'composite',
          parent
        },
        ...childRes.graph
      },
      handlers: {
        [builtNode]: handler,
        ...childRes.handlers
      }
    };
  }

  if (type === 'graph') {
    const childRes = Object.keys(nodePlan.nodes).reduce((soFar, planName) => {
      const builtName = glueNodeName(builtNode, planName);
      const built = build(
        plan, 
        nodePlan.nodes[planName],
        builtName,
        builtNode
      );
      return {
        nodes: [...soFar.nodes, builtName],
        graph: {...soFar.graph, ...built.graph},
        handlers: {...soFar.handlers, ...built.handlers}
      };
    }, {nodes: [], graph: {}, handlers: {}});

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
      graph: {
        [builtNode]: {
          type: 'graph',
          parent,
          arrows: {...emptyArrows, ...arrows},
          entryPoints,
          nodes: childRes.nodes
        },
        ...childRes.graph
      },
      handlers: {
        [builtNode]: handler,
        ...childRes.handlers
      }
    };
  }

};

export default build;