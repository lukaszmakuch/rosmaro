module.exports = () => {
  let locked = []
  let exception_to_throw_on_lock
  let exception_to_throw_on_unlock

  const do_not_throw_exceptions = () => {
    exception_to_throw_on_lock = undefined
    exception_to_throw_on_unlock = undefined
  }

  const make_locking_fail_with = exception => {
    exception_to_throw_on_lock = exception
  }

  const make_unlocking_fail_with = exception => {
    exception_to_throw_on_unlock = exception
  }

  const lock = async () => {

    if (exception_to_throw_on_lock) {
      throw exception_to_throw_on_lock
    }

    let unlock;
    const its_lock = new Promise((resolve, reject) => {
      unlock = resolve
    })

    const previous_locks = Promise.all(locked)
    locked.push(its_lock)
    await previous_locks
    return async () => {
      if (exception_to_throw_on_unlock) {
        throw exception_to_throw_on_unlock
      }

      unlock()
    }
  }

  return { lock, do_not_throw_exceptions, make_locking_fail_with, make_unlocking_fail_with }
}
