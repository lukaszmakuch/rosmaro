const make_storage_throw_catchable_errors = storage => ({
  async get_data() {
    try {
      return await storage.get_data()
    } catch (err) { throw {type: "unable_to_read_data", previous: err} }
  },
  async set_data(data) {
    try {
      return await storage.set_data(data)
    } catch (err) { throw {type: "unable_to_write_data", previous: err} }
  },
  async remove_data() {
    try {
      return await storage.remove_data()
    } catch (err) { throw {type: "unable_to_remove_data", previous: err} }
  }
})

const make_locking_fn_throw_catchable_errors = lock => async () => {
  try {
    const unlock = await lock()
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
