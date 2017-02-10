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

const get_nodes = (desc, state, transition_requests) => state.nodes.map(node => ({
  name: node,
  obj: get_node_prototype(desc, node, state.context, transition_requests)
}))

const get_nodes_with_fn = (nodes, desired_fn) => nodes.filter(node => node.obj[desired_fn]);

module.exports = (id, desc, storage) => {

  const rosmaro = new Proxy({}, {

    get: (target, prop_name) => {

      if (prop_name === 'nodes') {
        return get_curr_state(storage, desc, id).then(state => state.nodes);
      }

      return async function () {
        var transition_requests = {};

        const state = await get_curr_state(storage, desc, id);
        const nodes = get_nodes(desc, state, transition_requests)

        const nodes_with_matching_method = get_nodes_with_fn(nodes, prop_name);

        const nodes_with_matching_method_results = await Promise.all(nodes_with_matching_method
          .map(node => node.obj[prop_name].apply(node.obj, arguments)));

        const call_result = nodes_with_matching_method.reduce(
          (so_far, node, i) => Object.assign({}, so_far, {[node.name]: nodes_with_matching_method_results[i]}),
          {}
        )

        const next_state = get_next_state(desc, state, transition_requests);

        transition_requests = {};
        const new_nodes = get_nodes(desc, next_state, transition_requests)
        const new_nodes_with_on_entry_actions = get_nodes_with_fn(new_nodes, "on_entry")
        await Promise.all(new_nodes_with_on_entry_actions.map(node => node.obj["on_entry"]()))

        const state_after_on_entry_actions = get_next_state(desc, next_state, transition_requests);
        await storage.set_data(id, state_after_on_entry_actions);

        return call_result
      }
    }

  });

  return rosmaro;

};
