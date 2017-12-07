import buildGraph from './../graphBuilder/api';
import fsm, {initState} from './../fsm/api';
import extractPath from './../dispatcher/pathExtractor';
import dispatch from './../dispatcher/api';
import {withResolved} from './../utils';
import difference from 'lodash/difference';
import intersection from 'lodash/intersection';
import newID from 'uuid/v1';

const generateInstanceID = graph => Object.keys(graph).reduce((ids, node) => ({
  ...ids,
  [node]: newID()
}), {});

const newModelData = graph => ({
  FSMState: initState(graph),
  ctx: {},
  instanceID: generateInstanceID(graph)
});

const readModelData = (storage, graph) => {
  const stored = storage.get();
  if (stored) return stored;

  const generated = newModelData(graph);
  storage.set(generated);
  return generated;
};

// res like [{node, ctx, instanceID, method}]
const changedNodesToCall = ({
  leftNodes, 
  enteredNodes, 
  newCtx,
  oldCtx,
  newInstanceID,
  oldInstanceID
}) => {
  return [
    ...enteredNodes.map(node => ({
      node,
      ctx: newCtx,
      instanceID: newInstanceID,
      method: 'onEnter'
    })),
    ...leftNodes.map(node => {
      const alsoEntered = enteredNodes.includes(node);
      return {
        node,
        ctx: alsoEntered ? newCtx : oldCtx,
        instanceID: alsoEntered ? newInstanceID : oldInstanceID,
        method: 'afterLeft'
      };
    })
  ];
};

const callNodeActions = ({
  graph,
  handlers,
  newCtx,
  oldCtx,
  newInstanceID,
  oldInstanceID,
  leftNodes,
  enteredNodes
}) => {
  const callNodeMethod = ({ctx, instanceID, node, method}) => {
    return dispatch({
    //{graph, FSMState}
    ...extractPath(graph, node),
    handlers,
    ctx,
    instanceID,
    method,
    params: []
  })
};

  changedNodesToCall({
    leftNodes, 
    enteredNodes, 
    newCtx,
    oldCtx,
    newInstanceID,
    oldInstanceID
  }).forEach(callNodeMethod);
};

const handleCall = ({method, params, graph, handlers, storage, lock}) => {
  
  const unlock = lock();

  const modelData = readModelData(storage, graph);

  // {arrows, ctx, res}
  const dispatchRes = dispatch({
    graph,
    FSMState: modelData.FSMState,
    handlers,
    ctx: modelData.ctx,
    instanceID: modelData.instanceID,
    method,
    params
  });

  // {leftNodes, enteredNodes, FSMState}
  const transitionRes = fsm({
    graph, 
    FSMState: modelData.FSMState, 
    arrows: dispatchRes.arrows
  });

  const newInstanceID = generateInstanceID(graph);

  callNodeActions({
    graph,
    handlers,
    newCtx: dispatchRes.ctx,
    oldCtx: modelData.ctx,
    newInstanceID,
    oldInstanceID: modelData.instanceID,
    leftNodes: transitionRes.leftNodes,
    enteredNodes: transitionRes.enteredNodes
  });

  const newModelData = {
    FSMState: transitionRes.FSMState,
    ctx: dispatchRes.ctx,
    instanceID: newInstanceID
  };
  storage.set(newModelData);

  unlock();

  return dispatchRes.res;

};

export default ({
  graph: graphPlan,
  handlers: handlersPlan,
  external = {},
  storage: rawStorage,
  lock: rawLock
}) => {

  const storage = rawStorage;
  const lock = rawLock;

  const {graph, handlers} = buildGraph({
    graph: graphPlan,
    external,
    handlers: handlersPlan
  });

  return new Proxy({}, {
    get(target, method) {
      return function () {
        return handleCall({
          graph, 
          handlers, 
          storage, 
          lock,
          method,
          params: arguments
        });
      };
    }
  });

};