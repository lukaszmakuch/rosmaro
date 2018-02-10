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

            // adds basedOnHandlersPlan {handlers, ctxTransformFns, nodes}
            (
              readModelData
            ) => makeHandlers(handlersPlan, graphPlan),

            // adds modelParts {graph, handlers, ctxTransformFns}
            (
              readModelData,
              basedOnHandlersPlan
            ) => buildGraph({
              plan: graphPlan,
              //{ctxTransformFns, nodes, handlers}
              ...basedOnHandlersPlan,
              ctx: readModelData ? readModelData.ctx : {}
            }),

            // adds modelData {FSMState, ctx, instanceID}
            (
              readModelData,
              basedOnHandlersPlan,
              modelParts
            ) => extendModelData({
              readModelData,
              graph: modelParts.graph
            }),

            // adds dispatchRes {arrows, ctx, res}
            (
              readModelData,
              basedOnHandlersPlan,
              modelParts,
              modelData
            ) => dispatch({
              graph: modelParts.graph,
              FSMState: modelData.FSMState,
              handlers: modelParts.handlers,
              instanceID: modelData.instanceID,
              ctx: modelData.ctx,
              method: method,
              params: [...arguments],
              model,
              ctxTransformFns: modelParts.ctxTransformFns
            }),

            // adds newFSMState
            (
              readModelData,
              basedOnHandlersPlan,
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
              readModelData,
              basedOnHandlersPlan,
              modelParts,
              modelData,
              dispatchRes,
              newFSMState
            ) => hasAnyArrowBeenFollowed(dispatchRes.arrows),

            // adds newModelParts (so we know new new graph)
            (
              readModelData,
              basedOnHandlersPlan,
              modelParts,
              modelData,
              dispatchRes,
              newFSMState,
              anyArrowFollowed
            ) => buildGraph({
              plan: graphPlan,
              //{ctxTransformFns, nodes, handlers}
              ...basedOnHandlersPlan,
              ctx: dispatchRes.ctx
            }),

            // adds newInstanceID
            (
              readModelData,
              basedOnHandlersPlan,
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

            // stores the data
            (
              readModelData,
              basedOnHandlersPlan,
              modelParts,
              modelData,
              dispatchRes,
              newFSMState,
              anyArrowFollowed,
              newModelParts,
              newInstanceID
            ) => storage.set({
              FSMState: removeUnusedFSMState({
                newFSMState, 
                graph: newModelParts.graph
              }),
              ctx: dispatchRes.ctx,
              instanceID: newInstanceID
            }),

            (
              readModelData,
              basedOnHandlersPlan,
              modelParts,
              modelData,
              dispatchRes,
              newFSMState,
              anyArrowFollowed
            ) => ({
              res: dispatchRes.res,
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