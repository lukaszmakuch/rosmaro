var { get_node_prototype, get_next_state, add_nodes_ids } = require('./state_operations')
var { get_initial_nodes } = require('./desc')
const uuid = require('node-uuid')

const get_curr_state = async (storage, desc, rosmaro_id) => {
  const received_data = await storage.get_data(rosmaro_id);
  if (received_data) {
    return received_data;
  }

  const initial_nodes = get_initial_nodes(desc)

  const new_state = add_nodes_ids({
    nodes: initial_nodes,
    history: {},
    context: {}
  })

  await storage.set_data(rosmaro_id, new_state)
  return new_state
};

const get_nodes = (desc, state, transition_requests) => state.nodes.map(node => ({
  name: node,
  obj: get_node_prototype(desc, node, state, transition_requests)
}))

const get_nodes_with_fn = (nodes, desired_fn) => nodes.filter(node => node.obj[desired_fn]);

const get_names_of_nodes_requesting_transition = transition_requests => {
  let names = []
  for (node_name in transition_requests) {
    names.push(node_name)
  }
  return names
}

const get_nodes_requesting_transition = (all_nodes, transition_requests) => {
  const requesting_transition = get_names_of_nodes_requesting_transition(transition_requests)
  return all_nodes.filter(node => requesting_transition.includes(node.name))
}

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

const transition = async (desc, state, transition_requests) => {
  if (Object.getOwnPropertyNames(transition_requests).length == 0) {
    return state;
  }

  const nodes = get_nodes(desc, state, {})

  const [next_state, transition_actions] = get_next_state(desc, state, transition_requests)
  await transition_actions.before()

  const nodes_with_after_leave_action = get_nodes_with_fn(nodes, "after_leave")

  const nodes_with_before_leave_action =
    get_nodes_with_fn(nodes, "before_leave")
    .map(node => {
      const new_node = Object.create(node)
      new_node.obj.context = next_state.context
      return new_node
    })

  await Promise.all(nodes_with_before_leave_action.map(node => node.obj["before_leave"]()))

  var next_transition_requests = {};
  const new_nodes = get_nodes(desc, next_state, next_transition_requests)
  const new_nodes_with_on_entry_actions = get_nodes_with_fn(new_nodes, "on_entry")
  await Promise.all(new_nodes_with_on_entry_actions.map(node => node.obj["on_entry"]()))
  await transition_actions.after()

  await Promise.all(nodes_with_after_leave_action.map(node => node.obj["after_leave"]()))

  return transition(desc, next_state, next_transition_requests)
}

const should_synchronize_call = (nodes, method_name) => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node.obj.unsynchronized || !node.obj.unsynchronized.includes(method_name)) {
      return true
    }
  }

  return false;
}

const handle_method_call = async (desc, state, method_name, args) => {

  var transition_requests = {};
  const nodes = get_nodes(desc, state, transition_requests)

  const nodes_with_matching_method = get_nodes_with_fn(nodes, method_name);

  const synchronized = should_synchronize_call(nodes_with_matching_method, method_name)

  const get_call_result_and_next_state = async () => {
    const nodes_with_matching_method_results = await Promise.all(nodes_with_matching_method
      .map(node => node.obj[method_name].apply(node.obj, arguments)));

    const call_result = nodes_with_matching_method.reduce(
      (so_far, node, i) => Object.assign({}, so_far, {[node.name]: nodes_with_matching_method_results[i]}),
      {}
    )

    const next_state = await transition(desc, state, transition_requests)

    return {call_result, next_state}
  }

  return { synchronized, get_call_result_and_next_state }
}

const get_or_trigger = async (fn, on_error) => {
  try {
    return await fn()
  } catch (err) {
    await on_error()
    throw err
  }
}

module.exports = (id, desc, raw_storage, raw_lock) => {
  const storage = make_storage_throw_catchable_errors(raw_storage)
  const lock = make_locking_fn_throw_catchable_errors(raw_lock)

  const rosmaro = new Proxy({}, {

    get: (target, prop_name) => {

      if (prop_name === 'nodes') {
        return (async () => {
          const unlock = await lock(id)
          try {
            const state = await get_curr_state(storage, desc, id)
            return state.nodes
          } finally {
            unlock()
          }
        })()
      }

      return async function () {

        const unlock = await lock(id)

        const state = await get_or_trigger(() => get_curr_state(storage, desc, id), unlock)

        const {synchronized, get_call_result_and_next_state} = await get_or_trigger(
          () => handle_method_call(desc, state, prop_name, arguments),
          unlock
        )

        if (!synchronized) await unlock()
        try {
          const {call_result, next_state} = await get_call_result_and_next_state()
          await storage.set_data(id, next_state)
          return call_result
        } finally {
          if (synchronized) await unlock()
        }

      }
    }

  });

  return rosmaro;

};
