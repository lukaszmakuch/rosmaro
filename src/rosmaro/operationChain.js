import {withResolved} from './../utils';

const chain = ([operation, ...remainingOperations], results = []) => {
  if(!operation) return;

  if (remainingOperations.length === 0) {
    return operation(...results);
  }

  return withResolved(
    operation(...results), 
    result => chain(remainingOperations, [...results, result])
  );
};

export default chain;