import {instanceID} from './newModelData';
import fsm from './../fsm/api';
import {nonEmptyArrow} from './../utils';
import extractPath from './../dispatcher/pathExtractor';
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
  method
}) => {
  // it may be a Promise
  return dispatch({
    // {graph, FSMState}
    ...extractPath(graph, node),
    handlers,
    ctx: modelData.ctx,
    instanceID: modelData.instanceID,
    method,
    params: [node]
  });
}

const callNodeActions = ({
  graph,
  handlers,
  newModelData,
  oldModelData,
  leftNodes,
  enteredNodes
}) => {
  // res like [{node, modelData, method}]
  const requests = changedNodesToCall({
    leftNodes, 
    enteredNodes, 
    newModelData,
    oldModelData
  });
  const actions = requests.map(req => () => callNodeAction({graph, handlers, ...req}));
  return chain(actions);
};

// in: {graph, handlers, modelData: {ctx, FSMState, instanceID}, method, params}
// out: {res, newModelData} (may be a Promise, possibly rejected)
export default ({
  method,
  params,
  graph,
  handlers,
  modelData
}) => {

  const chained = chain([

    // {arrows, ctx, res}, may be a Promise
    () => dispatch({
      graph,
      FSMState: modelData.FSMState,
      handlers,
      ctx: modelData.ctx,
      instanceID: modelData.instanceID,
      method,
      params
    }),

    // {leftNodes, enteredNodes, FSMState}
    (dispatchRes) => fsm({
      graph, 
      FSMState: modelData.FSMState, 
      arrows: dispatchRes.arrows
    }),

    (dispatchRes, transitionRes) => ({
      ctx: dispatchRes.ctx,
      instanceID: anyNonEmptyArrow(dispatchRes.arrows) 
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
      enteredNodes: transitionRes.enteredNodes
    }),

    (dispatchRes, transitionRes, newModelData) => ({
      leftNodes: transitionRes.leftNodes,
      enteredNodes: transitionRes.enteredNodes,
      res: dispatchRes.res,
      newModelData
    })

  ]);

  return chained;
};
