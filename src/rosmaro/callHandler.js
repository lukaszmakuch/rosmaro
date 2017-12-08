import {instanceID} from './newModelData';
import fsm from './../fsm/api';
import extractPath from './../dispatcher/pathExtractor';
import dispatch from './../dispatcher/api';
import {generateInstanceID} from './newModelData';
import {changedNodesToCall} from './nodeActions';

// Handles the method call requested by calling model.method(...params).
// The result of the method dispatch here is the result of the model method call.
// Except the requested method, also "onEntry" and "afterLeft" methods are called.
// res like {newModelData, res, leftNodes, enteredNodes} may be a Promise
const callRequestedMethod = ({
  method,
  params,
  graph,
  handlers,
  modelData
}) => {

  // res: {arrows, ctx, res}, may be a Promise
  const dispatchRes = dispatch({
    graph,
    FSMState: modelData.FSMState,
    handlers,
    ctx: modelData.ctx,
    instanceID: modelData.instanceID,
    method,
    params
  });

  // res: {leftNodes, enteredNodes, FSMState}, may be a Promise
  const transitionRes = fsm({
    graph, 
    FSMState: modelData.FSMState, 
    arrows: dispatchRes.arrows
  });

  const newModelData = {
    ctx: dispatchRes.ctx,
    instanceID: generateInstanceID(graph),
    FSMState: transitionRes.FSMState
  };

  return {
    leftNodes: transitionRes.leftNodes,
    enteredNodes: transitionRes.enteredNodes,
    res: dispatchRes.res,
    newModelData
  };
};

// in: {graph, handlers, modelData: {ctx, FSMState, instanceID}, method, params}
// out: {res, newModelData} (may be a Promise, possibly rejected)
export default (request) => {

  // {newModelData, res, leftNodes, enteredNodes} may be a Promise
  const requestedMethodCallRes = callRequestedMethod(request);

  return requestedMethodCallRes;

};