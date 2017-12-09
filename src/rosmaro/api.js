import buildGraph from './../graphBuilder/api';
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
  external = {},
  storage,
  lock
}) => {

  const {graph, handlers} = buildGraph({
    graph: graphPlan,
    external,
    handlers: handlersPlan
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
            () => 
              storage.set(undefined)
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
            (modelData, handleRes) => 
              handleRes.res
          ]
        );

        const emergencyUnlock = (unlock, bodyErr) => callbackize(
          unlock,
          () => {throw bodyErr;},
          lockErr => {throw mergeErrors(lockErr, bodyErr)}
        );

        const regularUnlock = (unlock, bodyRes) => callbackize(
          unlock, 
          () => bodyRes
        );

        return callbackize(
          lock,
          unlock => callbackize(
            handlingBody,
            bodyRes => regularUnlock(unlock, bodyRes),
            bodyErr => emergencyUnlock(unlock, bodyErr)
          )
        );

      };
    }
  });

  return model;
};