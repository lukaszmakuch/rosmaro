import buildGraph from './../graphBuilder/api';
import {withResolved} from './../utils';
import newModelData, {generateInstanceID} from './newModelData';
import handleCall from './callHandler';

const readModelData = (storage, graph) => {
  const stored = storage.get();
  if (stored) return stored;

  const generated = newModelData(graph);
  storage.set(generated);
  return generated;
};

export default ({
  graph: graphPlan,
  handlers: handlersPlan,
  external = {},
  storage: rawStorage,
  lock: rawLock
}) => {

  const storage = rawStorage;

  const {graph, handlers} = buildGraph({
    graph: graphPlan,
    external,
    handlers: handlersPlan
  });

  return new Proxy({}, {
    get(target, method) {
      return function () {

        const modelData = readModelData(storage, graph);

        const {res, newModelData} = handleCall({
          graph, 
          handlers, 
          modelData,
          method,
          params: arguments
        });

        storage.set(newModelData);

        return res;

      };
    }
  });

};