// ('main:A', 'newMain') => 'newMain:A'
const renameMainInNodeName = (nodeName, newMain) => 
  newMain + nodeName.substr(4);

// (['main:A', 'main:B'], 'newMain') => ['newMain:A', 'newMain:B']
const renameMainInNodes = (nodes, newMain) =>
  nodes.map(node => renameMainInNodeName(node, newMain));

/*
in: {
  x: {target: 'main:A:B', entryPoint: 'start'}
}
out: {
  x: {target: 'newMain:A:B', entryPoint: 'start'}
}
*/
const renameMainInArrows = (arrows, newMain, parent) => {
  return Object.keys(arrows).reduce((newArrows, arrowName) => {
    const arrow = arrows[arrowName];
    return {
      ...newArrows,
      [arrowName]: {
        target: renameMainInNodeName(arrow.target, newMain),
        entryPoint: arrow.entryPoint
      }
    };
  }, {});
};

/*
in: {
  'main:A': {x: {target: 'main:A:B', entryPoint: 'start'}}
}
out: {
  'newMain:A': {x: {target: 'newMain:A:B', entryPoint: 'start'}}
}
*/
const renameMainInBoundArrows = (boundArrows, newMain, parent) => {
  return Object.keys(boundArrows).reduce((newArrows, srcNode) => ({
    ...newArrows,
    [renameMainInNodeName(srcNode, newMain)]: renameMainInArrows(
      boundArrows[srcNode], 
      newMain, 
      parent
    )
  }), {});
};

/*
in: {start: {target: 'main:A:A', entryPoints: 'start'}}
out: {start: {target: 'newMain:A:A', entryPoints: 'start'}}
*/
const renameMainInEntryPoints = (entryPoints, newMain, parent) => 
  Object.keys(entryPoints).reduce((newPoints, point) => ({
    ...newPoints,
    [point]: {
      target: renameMainInNodeName(entryPoints[point].target, newMain),
      entryPoint: entryPoints[point].entryPoint
    }
  }), {});

const renameMainInLeafNode = (leaf, newMain, parent) => ({
  type: 'leaf',
  parent: renameMainInNodeName(leaf.parent, newMain)
});

const renameMainInParent = (parent, newMain, newParent) => parent
  ? renameMainInNodeName(parent, newMain) 
  : newParent;

const renameMainInGraphNode = (graph, newMain, parent) => ({
  type: 'graph',
  parent: renameMainInParent(graph.parent, newMain, parent),
  nodes: renameMainInNodes(graph.nodes, newMain, parent),
  arrows: renameMainInBoundArrows(graph.arrows, newMain, parent),
  entryPoints: renameMainInEntryPoints(graph.entryPoints, newMain, parent)
});

const renameMainInCompositeNode = (composite, newMain, parent) => ({
  type: 'composite',
  nodes: renameMainInNodes(composite.nodes, newMain, parent),
  parent: renameMainInParent(composite.parent, newMain, parent)
});

const renameMainInNode = (node, newMain, parent) => ({
  'graph': renameMainInGraphNode,
  'composite': renameMainInCompositeNode,
  'leaf': renameMainInLeafNode
}[node.type])(node, newMain, parent);

const renameMainInGraph = (graph, newMain, parent) => 
  Object.keys(graph).reduce((newGraph, nodeName) => ({
    ...newGraph,
    [renameMainInNodeName(nodeName, newMain)]: renameMainInNode(
      graph[nodeName], 
      newMain,
      parent
    )
  }), {})

const renameMainInHandlers = (handlers, newMain, parent) => 
  Object.keys(handlers).reduce((newHandlers, nodeName) => ({
    ...newHandlers,
    [renameMainInNodeName(nodeName, newMain)]: handlers[nodeName]
  }), {});

export const renameMain = ({graph, handlers}, newMain, parent) => ({
  graph: renameMainInGraph(graph, newMain, parent),
  handlers: renameMainInHandlers(handlers, newMain)
});

// ('main', 'A') => 'main:A'
// (null, 'main') => 'main'
export const glueNodeName = (parent, child) => parent
  ? parent + ":" + child
  : child;