module.exports = () => {

  const data = {};
  var locked = false;
  var actions = [];

  const execute_actions = () => {
    actions.forEach(a => a())
    actions = []
  }

  return {

    lock() {
      this.locked = true;
    },

    unlock() {
      execute_actions()
      this.locked = false;
    },

    get_data(rosmaro_id) {
      const res = new Promise((resolve, reject) => {
        const action = () => {
          resolve(data[rosmaro_id])
        }
        actions.push(action)
      })
      if (!locked) execute_actions()
      return res
    },

    set_data(rosmaro_id, new_state_data) {
      const res = new Promise((resolve, reject) => {
        const action = () => {
          data[rosmaro_id] = new_state_data
          resolve()
        }
        actions.push(action)
      })
      if (!locked) execute_actions()
      return res
    },

  }
};
