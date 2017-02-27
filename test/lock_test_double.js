module.exports = () => {
  const locked = {}

  const lock = async resource_name => {
    if (!locked[resource_name]) {
      locked[resource_name] = []
    }

    let unlock;
    const its_lock = new Promise((resolve, reject) => {
      unlock = resolve
    })

    const previous_locks = Promise.all(locked[resource_name])
    locked[resource_name].push(its_lock)
    await previous_locks
    return async () => { unlock() }
  }

  return { lock }
}
