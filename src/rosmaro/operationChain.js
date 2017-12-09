import {callbackize} from './../utils';

const chain = ([operation, ...remainingOperations], results = []) => {
  if(!operation) return;

  if (remainingOperations.length === 0) {
    return operation(...results);
  }

  return callbackize(
    () => operation(...results), 
    result => chain(remainingOperations, [...results, result])
  );
};

export default chain;