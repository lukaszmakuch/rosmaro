export default log => {
  let doGet, doSet;
  let setPromise, getPromise;
  let getFn, setFn;
  let data;

  const config = ({
    asyncGet,
    asyncSet,
    setError,
    getError
  }) => {
    setPromise = new Promise((resolve, reject) => {
      doSet = setError ? () => reject(setError) : resolve;
    });
    getPromise = new Promise((resolve, reject) => {
      doGet = getError ? () => reject(getError) : resolve;
    });

    getFn = () => {
      log('getting data');
      if (asyncGet) {
        return getPromise
          .then(() => {
            log('got data');
            return data;
          })
          .catch(() => log('failed to get data'));
      } else {
        if (getError) {
          log('failed to get data');
          throw getError;
        }

        log('got data');
        return data;
      }
    };

    setFn = newData => {
      log('setting data');
      if (asyncSet) {
        return setPromise
          .then(() => {
            log('set data');
            data = newData;
          })
          .catch(() => log('failed to set data'));
      } else {
        if (setError) {
          log('failed to set data');
          throw setError;
        }

        data = newData;
        log('set data');
      }
    };

  };

  config({});
  return {
    config,
    doGet: () => doGet(),
    doSet: () => doSet(),
    set: newData => setFn(newData),
    get: () => getFn()
  };

};