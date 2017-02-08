var { get_node_prototype, get_next_state } = require('./state_operations')
var { get_initial_nodes } = require('./desc')

const get_curr_state = async (storage, desc, rosmaro_id) => {
  const received_data = await storage.get_data(rosmaro_id);
  if (received_data) {
    return received_data;
  }

  return {
    nodes: get_initial_nodes(desc),
    history: {},
    context: {}
  };
};

module.exports = (id, desc, storage) => {

  const rosmaro = new Proxy({}, {

    get: (target, prop_name) => {

      if (prop_name === 'nodes') {
        return get_curr_state(storage, desc, id).then(state => state.nodes);
      }

      return async function () {
        var transition_requests = {};

        const state = await get_curr_state(storage, desc, id);
        const nodes = state.nodes.map(node => ({
          name: node,
          obj: get_node_prototype(desc, node, state.context, transition_requests)
        }));

        const nodes_with_matching_method = nodes.filter(node => node.obj[prop_name]);

        const nodes_with_matching_method_results = await Promise.all(nodes_with_matching_method
          .map(node => node.obj[prop_name].apply(node.obj, arguments)));

        const next_state = get_next_state(desc, state, transition_requests);

        await storage.set_data(id, next_state);

        return nodes_with_matching_method.reduce(
          (so_far, node, i) => Object.assign({}, so_far, {[node.name]: nodes_with_matching_method_results[i]}),
          {}
        );

      }
    }

  });

  return rosmaro;

};
