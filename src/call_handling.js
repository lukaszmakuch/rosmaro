const new_node_id = require('node-uuid').v1
const {merge_contexts} = require('./context')

//nodes like ["A:A:A", "A:A:B"]
const should_synchronize_call = (flat_desc, nodes, method_name) => {
  for (let i = 0; i < nodes.length; i++) {
    const node_desc = flat_desc[nodes[i]]
    if (!node_desc.prototype.unsynchronized || !node_desc.prototype.unsynchronized.includes(method_name)) {
      return true
    }
  }

  return false;
}

const chain_fns = fns => async () => {
  for (let i = 0; i < fns.length; i++) {
    await fns[i]()
  }
}

/*
node like "A", arrow like "k"
result: nullify | {
  next_state_name: "B:C:D",
  before_transition: fn,
  after_transition: fn,
  machines_history: { 'B:C': 'B:C:D' },
  left_parents: ["A:X", "A:X:D"]
}
*/
const follow_up = (flat_desc, node, arrow, left_parents = []) => {

  //first we check if there's an arrow at the same level as the node
  const target_on_its_level = flat_desc[node]["transitions"][arrow]
  if (target_on_its_level) {
    const parent_machine = flat_desc[node].parent
    const new_history_part = parent_machine
      ? { [parent_machine]: target_on_its_level.next_state_name }
      : {}
    return Object.assign(
      {},
      target_on_its_level,
      {
        machines_history: new_history_part,
        left_parents
      }
    )
  }

  //if this node has a parent, then check if it can handle the transition
  const parent_node = flat_desc[node]["parent"]
  if (parent_node) {
    const map_arrow = flat_desc[node].map_leaving_transitions
    return follow_up(
      flat_desc,
      parent_node,
      map_arrow(arrow),
      [...left_parents, parent_node]
    )
  }

  //this node cannot handle this transition and it has no parent
}

const get_first_machine_parent_of_single_node = (flat_desc, node) => {
  const parent = flat_desc[node].parent
  if (!parent) return
  const parent_desc = flat_desc[parent]
  return (parent_desc.type == 'machine')
    ? parent
    : get_first_machine_parent(flat_desc, parent)
}

const get_first_machine_parent_of_nodes = (flat_desc, nodes) => {
  const get_parent_machine = node => get_first_machine_parent_of_single_node(flat_desc, node)
  return nodes.map(get_parent_machine).filter(a => a)
}

/*
result: ["A:B:C", "E:F:G"]
*/
const follow_down = (flat_desc, machines_history, node) => {
  switch (flat_desc[node].type) {

    //if it's a leaf, then it's the final node
    case 'leaf':
      return [node]
    break;

    //if it's a composite, then result is the result of following down all the
    //composed nodes
    case 'composite':
      return flat_desc[node].children.reduce(
        (targets, child) => targets.concat(follow_down(flat_desc, machines_history, child)),
        []
      )
    break;

    //if it's a machine, then follow down the current node of this machine
    case 'machine':
      const current_node = machines_history[node]
        ? machines_history[node]
        : flat_desc[node].default_entry_point
      return follow_down(flat_desc, machines_history, current_node)
    break;
  }
}

//node like "A:B:C"
//call result like { call_result, transition_request: { arrow, context } | nullify }
const build_node_obj = (node_desc, id, context) => {
  const node_prototype = node_desc.prototype

  const stateless_prototype = Object.assign({}, node_prototype, {
    id,
    context: node_desc.map_ctx_in(context),
    transition (arrow, new_context) {
      const context_to_set = new_context
        ? node_desc.map_ctx_out(new_context)
        : context
      this._set_transition_request(arrow, context_to_set)
    }
  })

  return new Proxy({}, {
    get(target, prop_name) {
      if (!stateless_prototype[prop_name]) return

      var transition_request
      const stateful_instance = Object.assign({}, stateless_prototype, {
        _set_transition_request(arrow, context) {
          transition_request = {arrow, context}
        }
      })
      return async () => {
        const call_result = await stateful_instance[prop_name].apply(stateful_instance, arguments)
        return {call_result, transition_request}
      }
    }
  })
}

/*
nodes like [{node: "A", active: true}, {node: "B:C:D", active: true}]
left_parents like ["B:C"]
result like [{node: "A", active: true}, {node: "B:C:D", active: false}]
*/
const update_node_activity = (nodes, left_parents) => nodes.map(node_props => {
  const is_node_parent = maybe_parent => node_props.node.startsWith(maybe_parent)
  const deativate = left_parents.some(is_node_parent)
  return deativate
    ? Object.assign({}, node_props, {active: false})
    : node_props
})

/*
nodes like [{node: "A", active: false}, {node: "A", active: true}]
result like [{node: "A", active: true}]
*/
const remove_duplicated_nodes = nodes => {
  let nodes_map = {};
  nodes.forEach(node_props => {
    const node = node_props.node
    if (nodes_map[node]) {
      if (!nodes_map[node].active) {
        nodes_map[node].active = true
      }
    } else {
      nodes_map[node] = node_props
    }
  })

  let result_nodes = [];
  for (node in nodes_map) {
    result_nodes.push(nodes_map[node])
  }

  return result_nodes
}

const unique = arr => arr.reduce(
  (uniq, e) => uniq.includes(e) ? uniq : [...uniq, e],
  []
)

const follow = (flat_desc, machines_history, nodes, arrows_to_follow) => {
  const followed_up = follow_many_up(flat_desc, nodes, arrows_to_follow)
  const new_machines_history = Object.assign({}, machines_history, followed_up.machines_history)

  const nodes_followed_down = follow_many_down(flat_desc, new_machines_history, followed_up.nodes)
  return Object.assign({}, followed_up, {nodes: nodes_followed_down, machines_history: new_machines_history})
}

const follow_many_down = (flat_desc, machines_history, nodes) => nodes.reduce((nodes, node_props) => {
  if (node_props.id) {
    return [...nodes, node_props]
  }

  const followed_down = follow_down(flat_desc, machines_history, node_props.node)
    .map(node => ({ node, active: node_props.active, id: new_node_id() }))
  return [...nodes, ...followed_down]
}, [])

const only_unique = elems => {
  let unique_elems = []
  for (let i = 0; i < elems.length; i++) {
    const e = elems[i]
    if (unique_elems.includes(e)) {
      return false
    } else {
      unique_elems.push(e)
    }
  }

  return true
}

/*
nodes like ["A", "B"]
throw an exception if this state is invalid
*/
const deny_unless_valid_state = (flat_desc, nodes) => {
  //if it's a child of a composite, then put the composite instead of the node itself
  const not_composite_nodes = nodes.map(n => {
    const parent = flat_desc[n].parent
    const parent_desc = flat_desc[parent]
    return parent_desc && parent_desc.type == 'composite'
      ? parent
      : n
  })
  const unique_nodes = unique(not_composite_nodes)
  const parents = unique_nodes.map(n => flat_desc[n].parent)
  if (!only_unique(parents)) {
    throw "transition to an invalid state " + JSON.stringify(parents) + "from " + JSON.stringify(unique_nodes)
  }
}

/*
nodes: [{node: "A", active: true, id: "abc"}, {node: "B:C:D", active: false, id: "qwe"}]
arrows_to_follow: {"B:C:D": "x"},
result: {
  nodes: [{node: "A", active: true, id: "zxc"}, {node: "B:C:D", active: false, id: null}],
  before_transition,
  after_transition,
  machines_history,
  changed_nodes: ["A", "B:C:D"]
}
it may throw an exception if following into an invalid state
*/
const follow_many_up = (flat_desc, nodes, arrows_to_follow) => {

  const followed_up = nodes.map(node_props => {
    const arrow = arrows_to_follow[node_props.node]

    const props_that_stayed_the_same = {
      next_state_name: node_props.node,
      active: node_props.active,
      id: node_props.id,
      before_transition: () => {},
      after_transition: () => {},
      machines_history: {},
      left_parents: [],
      any_arrow_to_follow: false
    }

    if (!arrow) return props_that_stayed_the_same

    const single_node_followed_up = follow_up(flat_desc, node_props.node, arrow)
    const id = single_node_followed_up ? null : node_props.id
    return Object.assign(
      {},
      single_node_followed_up || props_that_stayed_the_same,
      {
        active: node_props.active,
        id,
        previous_node: node_props.node,
        any_arrow_to_follow: null != single_node_followed_up
      }
    )
  })

  deny_unless_valid_state(
    flat_desc,
    followed_up.map(n => n.next_state_name)
  )

  const merged = followed_up.reduce((so_far, followed_node) => {
    return {
      nodes: [...so_far.nodes, {node: followed_node.next_state_name, active: followed_node.active, id: followed_node.id}],
      before_transition: chain_fns([followed_node.before_transition, so_far.before_transition]),
      after_transition: chain_fns([followed_node.after_transition, so_far.after_transition]),
      machines_history: Object.assign({}, so_far.machines_history, followed_node.machines_history),
      left_parents: [...so_far.left_parents, ...followed_node.left_parents],
      changed_nodes: followed_node.any_arrow_to_follow
        ? [...so_far.changed_nodes, followed_node.previous_node]
        : so_far.changed_nodes
    }
  }, {
    before_transition: () => {},
    after_transition: () => {},
    machines_history: {},
    left_parents: [],
    nodes: [],
    changed_nodes: []
  })

  return {
    nodes: remove_duplicated_nodes(update_node_activity(merged.nodes, merged.left_parents)),
    before_transition: merged.before_transition,
    after_transition: merged.after_transition,
    machines_history: merged.machines_history,
    changed_nodes: unique(merged.changed_nodes)
  }
}

const call_nodes = async (nodes, method, args) => {
  let call_results = {}
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    call_results[n.node] = await n.obj[method].apply(n.obj, args)
  }
  return call_results
}

const extract_from_results = (call_results, fn) => {
  const nodes = Object.keys(call_results)
  return nodes.reduce((results, key) => {
    return Object.assign({}, results, {[key]: fn(call_results, key)})
  }, {})
}

const extract_just_results = call_results => extract_from_results(
  call_results,
  (call_results, key) => call_results[key].call_result
)

const extract_just_arrows = call_results => extract_from_results(
  call_results,
  (call_results, key) => call_results[key].transition_request ?
    call_results[key].transition_request.arrow
    : null
)

const extract_context = (original_context, call_results) => {
  const new_contexts = Object.keys(call_results)
    .map(k => call_results[k])
    .map(r => r.transition_request ? r.transition_request.context : null)
    .filter(a => a)

  return merge_contexts(original_context, new_contexts)
}

const extract_nodes_requesting_transiton = call_results => Object.keys(call_results)
  .reduce((requesting_transition, node) => {
    return call_results[node].transition_request
      ? [...requesting_transition, node]
      : requesting_transition
  }, [])

/*
result like {after_leaving_nodes, before_leaving_nodes}
*/
const extract_leave_fns = node_objs => {
  let after = []
  let before = []
  node_objs.forEach(n => {
    after.push(n.after_leave ? n.after_leave.bind(n) : () => {})
    before.push(n.before_leave ? n.before_leave.bind(n) : () => {})
  })
  return {
    after: chain_fns(after),
    before: chain_fns(before)
  }
}

const activate_all_nodes = nodes => nodes
  .map(n => Object.assign({}, n, {active: true}))

/*
result: {
  call_results,
  any_transition_occured,
  nodes,
  context,
  machines_history
  before_transition: fn,
  after_transition: fn,
  before_leaving_node: fn,
  after_leaving_node: fn,
}
*/
const tick = async (flat_desc, context, machines_history, nodes, method_name, args) => {

  let nodes_to_call = []
  let nodes_map = {}
  nodes.forEach(node_props => {
    let node = node_props.node
    let obj = build_node_obj(flat_desc[node], node_props.id, context)
    if (obj[method_name]) {
      nodes_map[node_props.node] = obj
      nodes_to_call.push({obj, node})
    }
  })

  const call_results = await call_nodes(nodes_to_call, method_name, args)

  const new_context = extract_context(context, call_results)

  const arrows_to_follow = extract_just_arrows(call_results)

  const followed = follow(flat_desc, machines_history, nodes, arrows_to_follow)

  const changed_nodes = followed.changed_nodes.map(n => nodes_map[n])

  const any_transition_occured = changed_nodes.length > 0

  const leave_fns = extract_leave_fns(changed_nodes)

  return {
    call_results: extract_just_results(call_results),
    nodes: followed.nodes,
    any_transition_occured,
    context: new_context,
    machines_history: Object.assign({}, followed.machines_history, machines_history),
    before_transition: followed.before_transition,
    after_transition: followed.after_transition,
    before_leaving_node: leave_fns.before,
    after_leaving_node: leave_fns.after
  }
}

/*
result: {
  call_results,
  nodes,
  context,
  machines_history
}
*/
const handle_call = async (flat_desc, context, machines_history, nodes, method_name, args, call_results, after_prev_tick = () => {}) => {
  const tick_result = await tick(flat_desc, context, machines_history, nodes, method_name, args)
  const final_call_result = call_results ? call_results : tick_result.call_results

  const before_fns = chain_fns([
    tick_result.before_transition,
    tick_result.before_leaving_node
  ])

  const after_fns = chain_fns([
    tick_result.after_transition,
    tick_result.after_leaving_node
  ])

  await after_prev_tick()
  await before_fns()

  if (tick_result.any_transition_occured) {
    return handle_call(
      flat_desc,
      tick_result.context,
      tick_result.machines_history,
      tick_result.nodes,
      'on_entry',
      [],
      final_call_result,
      after_fns
    )
  } else {
    return {
      call_results: final_call_result,
      nodes: tick_result.nodes,
      context: tick_result.context,
      machines_history: tick_result.machines_history
    }
  }

}

/*
nodes like [{node, id}, ...]
result: {
  call_results,
  state: {
    nodes,
    context,
    machines_history
  }
}
*/
const get_next_state = async (flat_desc, context, machines_history, nodes, method_name, args, call_results) => {
  const activated_nodes = activate_all_nodes(nodes)
  const state = await handle_call(flat_desc, context, machines_history, activated_nodes, method_name, args, call_results)
  return {
    call_results: state.call_results,
    state: {
      nodes: state.nodes.filter(n => n.active).map(n => ({ node: n.node, id: n.id })),
      context: state.context,
      machines_history: state.machines_history
    }
  }
}

module.exports = { get_next_state, should_synchronize_call }
