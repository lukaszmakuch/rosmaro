module.exports = () => {
  let data = undefined
  var locked = false
  var actions = []

  const execute_actions = () => {
    actions.forEach(a => a())
    actions = []
  }

  var writing_error
  var reading_error

  return {

    is_empty() {
      return !data
    },

    fix() {
      writing_error = undefined
      reading_error = undefined
    },

    make_writing_fail_with(err) {
      writing_error = err
    },

    make_reading_fail_with(err) {
      reading_error = err
    },

    lock() {
      this.locked = true;
    },

    unlock() {
      execute_actions()
      this.locked = false;
    },

    get_data() {
      const res = new Promise((resolve, reject) => {
        const to_throw = reading_error
        const action = () => {
          if (to_throw) reject(to_throw)
          else resolve(data)
        }
        actions.push(action)
      })
      if (!locked) execute_actions()
      return res
    },

    set_data(new_state) {
      const res = new Promise((resolve, reject) => {
        const to_throw = writing_error
        const action = () => {
          if (to_throw) {
            reject(to_throw)
          } else {
            data = new_state
            resolve()
          }
        }
        actions.push(action)
      })
      if (!locked) execute_actions()
      return res
    },

    remove_data() {
      data = undefined
    }

  }
}
