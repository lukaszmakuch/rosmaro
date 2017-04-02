const make_storage_throw_catchable_errors = storage => ({
  async get_data(id) {
    try {
      return await storage.get_data(id)
    } catch (err) { throw {type: "unable_to_read_data", previous: err} }
  },
  async set_data(id, data) {
    try {
      return await storage.set_data(id, data)
    } catch (err) { throw {type: "unable_to_write_data", previous: err} }
  }
})

const make_locking_fn_throw_catchable_errors = lock => async id => {
  try {
    const unlock = await lock(id)
    return async () => {
      try {
        await unlock()
      } catch (err) { throw {type: "unable_to_unlock", previous: err} }
    }
  } catch (err) { throw {type: "unable_to_lock", previous: err} }
}

const get_or_trigger = async (fn, on_error) => {
  try {
    return await fn()
  } catch (err) {
    await on_error()
    throw err
  }
}

module.exports = {make_storage_throw_catchable_errors, make_locking_fn_throw_catchable_errors, get_or_trigger}
