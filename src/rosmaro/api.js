import buildGraph from './../graphBuilder/api';
import buildHandler from './../handlers/api';
import chain from './operationChain';
import {callbackize, mergeErrors} from './../utils';
import newModelData, {generateInstanceID} from './newModelData';
import {handleCall, handleRemoveCall} from './callHandler';

const readModelData = (storage, graph) => callbackize(
  () => storage.get(),
  stored => stored || newModelData(graph)
);

export default ({
  graph: graphPlan,
  handlers: handlersPlan,
  storage,
  lock,
  afterTransition = () => {}
}) => {

  const {graph, handlers} = buildGraph({
    plan: {
      graph: graphPlan,
      handlers: handlersPlan
    },
    buildHandler
  });

  const model = new Proxy({}, {
    get(target, method) {
      return function () {

        const handlingBody = () => chain(
          method === 'remove'

          // removing the model
          ? [
            () => 
              readModelData(storage, graph),
            (modelData) => 
              handleRemoveCall({
                graph,
                handlers, 
                modelData,
                model,
              }),
            () => {
              storage.set(undefined);
              return {res: undefined, anyArrowFollowed: false}
            }
          ]

          //handling a call
          : [
            () => 
              readModelData(storage, graph),
            (modelData) => 
              handleCall({
                graph,
                handlers, 
                modelData,
                method,
                model,
                params: [...arguments]
              }),
            (modelData, handleRes) => 
              storage.set(handleRes.newModelData),
            (modelData, handleRes) => ({
              res: handleRes.res,
              anyArrowFollowed: handleRes.anyArrowFollowed
            })
          ]
        );

        const emergencyUnlock = (unlock, bodyErr) => callbackize(
          unlock,
          () => {throw bodyErr;},
          lockErr => {throw mergeErrors(lockErr, bodyErr)}
        );

        // 1. releases the lock
        // 2. if any arrow has been followed, triggers the *afterTransition* listener
        // 3. returns the result of the call
        const regularUnlock = (unlock, res, anyArrowFollowed) => callbackize(
          unlock, 
          () => {
            if (anyArrowFollowed) afterTransition();
            return res;
          }
        );

        return callbackize(
          lock,
          unlock => callbackize(
            handlingBody,
            ({res, anyArrowFollowed}) => regularUnlock(unlock, res, anyArrowFollowed),
            bodyErr => emergencyUnlock(unlock, bodyErr)
          )
        );

      };
    }
  });

  return model;
};