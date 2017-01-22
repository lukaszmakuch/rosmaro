module.exports = () => {

  var data = {};

  return {

    get_data(rosmaro_id) {
      return Promise.resolve(data[rosmaro_id]);
    },

    set_data(rosmaro_id, new_state_data) {
      data[rosmaro_id] = new_state_data;
      return Promise.resolve();
    },

  }
};
