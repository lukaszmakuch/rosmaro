const {
  get_initial_nodes,
  flatten
} = require('./desc')
const {
  make_storage_throw_catchable_errors,
  make_locking_fn_throw_catchable_errors,
  get_or_trigger
} = require('./error_decoration')
const new_node_id = require('node-uuid').v1
const {
  get_next_state,
  should_synchronize_call
} = require('./call_handling')


/*
nodes: ["A"]
result: {
  nodes: [{node, id}],
  context,
  machines_history
}
*/
const get_initial_state = desc => ({
  context: {},
  machines_history: {},
  nodes: get_initial_nodes(desc).map(node => ({ node, id: new_node_id() }))
})

const get_curr_state = async (storage, desc, rosmaro_id) => {
  const received_data = await storage.get_data(rosmaro_id);
  if (received_data) {
    return received_data;
  }

  const new_state = get_initial_state(desc)
  await storage.set_data(rosmaro_id, new_state)
  return new_state
};

module.exports = (id, desc, raw_storage, raw_lock) => {
  const storage = make_storage_throw_catchable_errors(raw_storage)
  const lock = make_locking_fn_throw_catchable_errors(raw_lock)
  const flat_desc = flatten(desc)

  const rosmaro = new Proxy({}, {

    get: (target, prop_name) => {

      //consider removing it
      if (prop_name === 'nodes') {
        return (async () => {
          const unlock = await lock(id)
          try {
            const state = await get_curr_state(storage, desc, id)
            return state.nodes.map(n => n.node)
          } finally {
            unlock()
          }
        })()
      }

      return async function () {

        const unlock = await lock(id)
        const state = await get_or_trigger(
          () => get_curr_state(storage, desc, id),
          unlock
        )

        const synchronized = should_synchronize_call(
          flat_desc,
          state.nodes.map(n => n.node),
          prop_name
        )

        if (!synchronized) await unlock()

        try {
          const next_state = await get_next_state(
            flat_desc,
            state.context,
            state.machines_history,
            state.nodes,
            prop_name,
            arguments
          )

          await storage.set_data(id, next_state.state)
          return next_state.call_results
        } finally {
          if (synchronized) await unlock()
        }

      }
    }

  });

  return rosmaro;

};
