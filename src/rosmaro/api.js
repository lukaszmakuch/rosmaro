import buildGraph from './../graphBuilder/api';
import makeHandlers from './../handlers/api';
import fsm from './../fsm/api';
import chain from './operationChain';
import {callbackize, mergeErrors, nonEmptyArrow} from './../utils';
import dispatch from './../dispatcher/api';
import extendModelData, {generateInstanceID} from './modelData';

const hasAnyArrowBeenFollowed = arrows => arrows.some(nonEmptyArrow);

const emergencyUnlock = (unlock, bodyErr) => callbackize(
  unlock,
  () => {throw bodyErr;},
  lockErr => {throw mergeErrors(lockErr, bodyErr)}
);

const removeUnusedFSMState = ({newFSMState, graph}) => {
  const minimalFSMState = Object.keys(graph).reduce((FSMState, node) => {
    const existingState = newFSMState[node];
    if (!existingState) return FSMState;
    return {
      ...FSMState,
      [node]: newFSMState[node]
    };
  }, {});
  // console.log(minimalFSMState);
  return minimalFSMState;
}

// 1. releases the lock
// 2. if any arrow has been followed, triggers the *afterTransition* listener
// 3. returns the result of the call
const regularUnlock = (unlock, res, anyArrowFollowed, afterTransition) => callbackize(
  unlock, 
  () => {
    if (anyArrowFollowed) afterTransition();
    return res;
  }
);

const getNewInstanceID = ({
  anyArrowFollowed,
  oldInstanceID,
  graph
}) => anyArrowFollowed ? generateInstanceID(graph) : oldInstanceID;

// res {newModelData: {FSMState, ctx, instanceId}, anyArrowFollowed, res}
const handleMethodCall = ({
  model,
  method,
  parameters,
  readModelData,
  basedOnHandlersPlan,
  graphPlan
}) => {
  return chain([

    // adds modelParts {graph, handlers, lenses}
    (
    ) => buildGraph({
      plan: graphPlan,
      //{lenses, nodes, handlers}
      ...basedOnHandlersPlan,
      ctx: readModelData ? readModelData.ctx : {}
    }),


    // adds modelData {FSMState, ctx, instanceID}
    (
      modelParts
    ) => extendModelData({
      readModelData,
      graph: modelParts.graph
    }),

    // adds dispatchRes {arrows, ctx, res}
    (
      modelParts,
      modelData
    ) => dispatch({
      graph: modelParts.graph,
      FSMState: modelData.FSMState,
      handlers: modelParts.handlers,
      instanceID: modelData.instanceID,
      ctx: modelData.ctx,
      method: method,
      params: parameters,
      model,
      lenses: modelParts.lenses
    }),

    // adds newFSMState
    (
      modelParts,
      modelData,
      dispatchRes
    ) => fsm({
      graph: modelParts.graph, 
      FSMState: modelData.FSMState, 
      arrows: dispatchRes.arrows
    }),

    // adds anyArrowFollowed
    (
      modelParts,
      modelData,
      dispatchRes,
      newFSMState
    ) => hasAnyArrowBeenFollowed(dispatchRes.arrows),

    // adds newModelParts (so we know the new graph)
    (
      modelParts,
      modelData,
      dispatchRes,
      newFSMState,
      anyArrowFollowed
    ) => buildGraph({
      plan: graphPlan,
      //{lenses, nodes, handlers}
      ...basedOnHandlersPlan,
      ctx: dispatchRes.ctx
    }),

    // adds newInstanceID
    (
      modelParts,
      modelData,
      dispatchRes,
      newFSMState,
      anyArrowFollowed,
      newModelParts
    ) => getNewInstanceID({
      anyArrowFollowed,
      oldInstanceID: modelData.instanceID,
      graph: newModelParts.graph
    }),

    // returns {newModelData: {FSMState, ctx, instanceId}, anyArrowFollowed, res}
    (
      modelParts,
      modelData,
      dispatchRes,
      newFSMState,
      anyArrowFollowed,
      newModelParts,
      newInstanceID
    ) => ({
      newModelData: {
        FSMState: removeUnusedFSMState({
          newFSMState, 
          graph: newModelParts.graph
        }),
        ctx: dispatchRes.ctx,
        instanceID: newInstanceID
      },
      anyArrowFollowed,
      res: dispatchRes.res
    }),

  ]);
};

const handleManyPossibleMethodCalls = ({
  model,
  method,
  parameters,
  readModelData,
  basedOnHandlersPlan,
  graphPlan,
  firstCall = true,
  firstRes = undefined,
  firstCallFollowedArrow = false
}) => {

  return callbackize(
    () => handleMethodCall({
      model,
      method,
      parameters,
      readModelData,
      basedOnHandlersPlan,
      graphPlan
    }),
    ({newModelData, anyArrowFollowed, res}) => {
      if (!anyArrowFollowed) return {
        newModelData, 
        anyArrowFollowed: firstCall ? anyArrowFollowed : firstCallFollowedArrow, 
        res: firstCall ? res : firstRes
      };

      return handleManyPossibleMethodCalls({
        model,
        method: 'run',
        parameters: [],
        readModelData: newModelData,
        basedOnHandlersPlan,
        graphPlan,
        firstCall: false,
        firstRes: firstCall ? res : firstRes,
        firstCallFollowedArrow: firstCall ? anyArrowFollowed : firstCallFollowedArrow
      });
    }
  );

};

export default ({
  graph: graphPlan,
  handlers: handlersPlan,
  storage,
  lock,
  afterTransition = () => {}
}) => {

  const model = new Proxy({}, {
    get(target, method) {
      return function () {

        const handlingBody = () => chain(
          method === 'remove'

          // removing the model
          ? [
            // actually remove the model
            () => {
              storage.set(undefined);
              return {res: undefined, anyArrowFollowed: false}
            }
          ]

          //handling a call
          : [

            // adds readModelData (null or {FSMState, ctx, instanceID})
            (
            ) => storage.get(),

            // adds basedOnHandlersPlan {handlers, lenses, nodes}
            (
              readModelData
            ) => makeHandlers(handlersPlan, graphPlan),

            // adds {newModelData: {FSMState, ctx, instanceId}, anyArrowFollowed, res}
            (
              readModelData,
              basedOnHandlersPlan
            ) => handleManyPossibleMethodCalls({
              model,
              method,
              parameters: [...arguments],
              readModelData,
              basedOnHandlersPlan,
              graphPlan
            }),

            // stores the data
            (
              readModelData,
              basedOnHandlersPlan,
              {newModelData, anyArrowFollowed, res}
            ) => storage.set(newModelData),

            (
              readModelData,
              basedOnHandlersPlan,
              {newModelData, anyArrowFollowed, res}
            ) => ({
              res: res,
              anyArrowFollowed
            })

          ]
        );

        return callbackize(
          lock,
          unlock => callbackize(
            handlingBody,
            ({res, anyArrowFollowed}) => regularUnlock(unlock, res, anyArrowFollowed, afterTransition),
            bodyErr => emergencyUnlock(unlock, bodyErr)
          )
        );

      };
    }
  });

  return model;
};