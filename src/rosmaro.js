var { get_initial_state, get_node_prototype, get_next_state } = require('./state_operations');


const get_current_state_data = async (storage, desc, rosmaro_id) => {
  const received_data = await storage.get_data(rosmaro_id);
  if (received_data) {
    return received_data;
  }

  return {state: get_initial_state(desc), history: {}};
};

const extend_node_prototype = (node_prototype, node_name, transition_requests) => Object.assign({}, {
  transition: function (arrow) {
    transition_requests[node_name] = arrow;
  }
}, node_prototype)

module.exports = (id, desc, storage) => {

  const rosmaro = new Proxy({}, {

    get: (target, name) => {

      if (name === 'state') {
        return get_current_state_data(storage, desc, id).then(data => data.state);
      }

      return async function () {
        var transition_requests = {};
        // like ["A:AB:ABA", "A:AB:ABB"]
        const state_data = await get_current_state_data(storage, desc, id);
        const nodes = state_data.state
          .map(node => extend_node_prototype(get_node_prototype(desc, node), node, transition_requests));
        const nodes_with_matching_method = nodes.filter(node => node[name]);

        const call_results = await Promise.all(nodes_with_matching_method
          .map(node => node[name].apply(node, arguments)));

        const next_state = get_next_state(desc, state_data.state, state_data.history, transition_requests);

        await storage.set_data(id, next_state);
        return call_results;

      }
    }

  });

  return rosmaro;

};
