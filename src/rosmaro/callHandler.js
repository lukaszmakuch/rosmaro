import {instanceID} from './newModelData';
import fsm from './../fsm/api';
import {nonEmptyArrow} from './../utils';
import extractPath from './../dispatcher/pathExtractor';
import graphDiff from './../fsm/graphDiff';
import dispatch from './../dispatcher/api';
import chain from './operationChain';
import {generateInstanceID} from './newModelData';
import {changedNodesToCall} from './nodeActions';

const anyNonEmptyArrow = arrows => arrows.some(nonEmptyArrow);

const callNodeAction = ({
  graph,
  node,
  handlers,
  modelData,
  method,
  model
}) => {
  // it may be a Promise
  return dispatch({
    // {graph, FSMState}
    ...extractPath(graph, node),
    handlers,
    ctx: modelData.ctx,
    instanceID: modelData.instanceID,
    method,
    model,
    params: [{}, {targetID: node}]
  });
}

const callNodeActions = ({
  graph,
  handlers,
  newModelData,
  oldModelData,
  leftNodes,
  enteredNodes,
  model
}) => {
  // res like [{node, modelData, method}]
  const requests = changedNodesToCall({
    leftNodes, 
    enteredNodes, 
    newModelData,
    oldModelData
  });
  const actions = requests.map(req => () => callNodeAction({graph, model, handlers, ...req}));
  return chain(actions);
};

export const handleRemoveCall = ({
  graph,
  handlers,
  modelData,
  model
}) => {
  const actions = graphDiff({graph, oldFSMState: modelData.FSMState})
    .leftNodes
    .map(node => () => callNodeAction({graph, handlers, node, model, modelData, method: 'afterLeft'}));
  return chain(actions);
};

// in: {graph, handlers, modelData: {ctx, FSMState, instanceID}, method, params}
// out: {res, newModelData} (may be a Promise, possibly rejected)
export const handleCall = ({
  method,
  params,
  graph,
  handlers,
  modelData,
  model
}) => {

  const chained = chain([

    // res like {arrows, ctx, res}, may be a Promise
    () => dispatch({
      graph,
      FSMState: modelData.FSMState,
      handlers,
      ctx: modelData.ctx,
      instanceID: modelData.instanceID,
      method,
      params,
      model
    }),

    // res like {leftNodes, enteredNodes, FSMState, anyArrowFollowed}
    (dispatchRes) => ({
      ...fsm({
        graph, 
        FSMState: modelData.FSMState, 
        arrows: dispatchRes.arrows,
      }),
      anyArrowFollowed: anyNonEmptyArrow(dispatchRes.arrows)
    }),

    (dispatchRes, transitionRes) => ({
      ctx: dispatchRes.ctx,
      instanceID: transitionRes.anyArrowFollowed
        ? generateInstanceID(graph)
        : modelData.instanceID,
      FSMState: transitionRes.FSMState
    }),

    (dispatchRes, transitionRes, newModelData) => callNodeActions({
      graph,
      handlers,
      newModelData,
      oldModelData: modelData,
      leftNodes: transitionRes.leftNodes,
      enteredNodes: transitionRes.enteredNodes,
      model
    }),

    (dispatchRes, transitionRes, newModelData) => ({
      leftNodes: transitionRes.leftNodes,
      enteredNodes: transitionRes.enteredNodes,
      anyArrowFollowed: transitionRes.anyArrowFollowed,
      res: dispatchRes.res,
      newModelData
    })

  ]);

  return chained;
};
