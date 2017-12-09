export default log => {
  let lockFn;

  let doLock;
  let doUnlock;

  let lockPromise;
  let unlockPromise;

  const config = ({
    asyncLock,
    asyncUnlock,
    lockError,
    unlockError
  }) => {
    lockPromise = new Promise((resolve, reject) => {
      doLock = lockError ? () => reject(lockError) : resolve;
    });

    unlockPromise = new Promise((resolve, reject) => {
      doUnlock = unlockError ? () => reject(unlockError) : resolve;
    });

    const unlockFn = () => {
      log('unlocking');
      if (asyncUnlock) {
        return unlockPromise
          .then(() => log('unlocked'))
          .catch(() => log('failed to unlock'))
      } else {
        if (unlockError) {
          log('failed to unlock')
          throw unlockError;
        }

        log('unlocked')
      }
    };

    lockFn = () => {
      log('locking');
      if (asyncLock) {
        return lockPromise
          .then(() => {
            log('locked');
            return unlockFn;
          })
          .catch(() => log('failed to lock'))
      } else {
        if (lockError) {
          log('failed to lock')
          throw lockError;
        }

        log('locked')
        return unlockFn;
      }
    }
  };

  config({asyncLock: false, asyncUnlock: false, lockError: null, unlockError: null});
  return {
    fn: () => lockFn(), 
    config, 
    doLock: () => doLock(), 
    doUnlock: () => doUnlock()
  };
}