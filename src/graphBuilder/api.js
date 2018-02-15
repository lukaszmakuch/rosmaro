import {glueNodeName} from './nodeNames';
import omit from 'lodash/omit';
import transparentHandler from './../handlers/transparent';
import {view as Rview} from 'ramda';

const build = ({
  plan, 
  lenses,
  nodes,
  handlers,
  ctx: rawCtx,
  planNode = 'main',
  builtNode = 'main',
  parent = null
}) => {
  const nodeLens = lenses[planNode];
  const ctx = Rview(nodeLens({localNodeName: planNode}), rawCtx);
  const nodePlan = plan[planNode];
  const type = nodePlan.type;
  const handler = handlers[planNode];

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
      },
      lenses: {
        [builtNode]: nodeLens
      }
    };
  }

  //TODO: this is ugly. It should be replaced with a function without IFs.
  if (['composite', 'dynamicComposite'].includes(type)) {
    const regularComposite = type === 'composite';
    const childNames = regularComposite ? Object.keys(nodePlan.nodes) : nodes[planNode]({ctx})
    const childRes = childNames.reduce((soFar, planName) => {
      const builtName = glueNodeName(builtNode, planName);
      const childPlanNode = regularComposite  ? nodePlan.nodes[planName] : nodePlan.nodeTemplate;
      const built = build({
        plan, 
        lenses,
        nodes,
        handlers,
        ctx,
        planNode:  childPlanNode,
        builtNode: builtName,
        parent: builtNode
      });
      return {
        nodes: [...soFar.nodes, builtName],
        graph: {...soFar.graph, ...built.graph},
        handlers: {...soFar.handlers, ...built.handlers},
        lenses: {...soFar.lenses, ...built.lenses}
      };
    }, {nodes: [], graph: {}, handlers: {}, lenses: {}});

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
      },
      lenses: {
        [builtNode]: nodeLens,
        ...childRes.lenses
      },
    };
  }

  if (type === 'graph') {
    const childRes = Object.keys(nodePlan.nodes).reduce((soFar, planName) => {
      const builtName = glueNodeName(builtNode, planName);
      const built = build({
        plan, 
        lenses,
        nodes,
        handlers,
        ctx,
        planNode: nodePlan.nodes[planName],
        builtNode: builtName,
        parent: builtNode
      });
      return {
        nodes: [...soFar.nodes, builtName],
        graph: {...soFar.graph, ...built.graph},
        handlers: {...soFar.handlers, ...built.handlers},
        lenses: {...soFar.lenses, ...built.lenses},
      };
    }, {nodes: [], graph: {}, handlers: {}, lenses: {}});

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
      },
      lenses: {
        [builtNode]: nodeLens,
        ...childRes.lenses
      },
    };
  }

};

export default build;