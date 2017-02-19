const merge_contexts = require('./context').merge;
const flatten = require('./desc').flatten;
const uuid = require('node-uuid')

const extract_current_history_deep = (flat_desc, nodes) =>
{
  const parents = nodes
    .map(node => flat_desc[node].parent)
    .filter(a => a);

  const with_parent_as_key = node_id => ({ [flat_desc[node_id].parent]: node_id });
  const is_machine = node_id => flat_desc[flat_desc[node_id].parent].type === "machine";

  return nodes
    .filter(node_id => flat_desc[node_id].parent)
    .filter(is_machine)
    .map(with_parent_as_key)
    .concat(parents.length > 0 ? extract_current_history(flat_desc, parents) : [])
};

const extract_current_history = (flat_desc, state) =>
  Object.assign.apply({}, [{}, ...extract_current_history_deep(flat_desc, state)])

const follow_arrow = (flat_desc, target_nodes) => {
  var expanded_nodes = [];
  var changed = false;
  for (let node of target_nodes) {
    switch (flat_desc[node].type) {
      case 'leaf':
        expanded_nodes.push(node);
        break;
      case 'composite':
        expanded_nodes = expanded_nodes.concat(flat_desc[node].children);
        changed = true;
        break;
      case 'machine':
        expanded_nodes.push(flat_desc[node].entry_point);
        changed = true;
    }
  }

  return changed ? follow_arrow(flat_desc, expanded_nodes) : target_nodes;
}

const shallow_follow_arrow = (node, flat_desc, arrow_by_node) => {
  const transition = flat_desc[node]["transitions"][arrow_by_node[node]]
  if (transition) {
    return transition.next_state_name;
  }

  if (flat_desc[node].parent) {
    const parent = flat_desc[node].parent;
    const map_arrow = flat_desc[node].map_leaving_transitions
    return shallow_follow_arrow(
      parent,
      flat_desc,
      Object.assign({}, arrow_by_node, {[parent]: map_arrow(arrow_by_node[node])})
    )
  }
}

const leave_highest_nodes = (flat_desc, nodes) => {
  var highest_node_index = undefined;
  var highest_nodes = [];

  for (const target_node of nodes) {
    const its_depth = flat_desc[target_node].depth;
    if (!highest_node_index || highest_node_index > its_depth) {
      highest_node_index = its_depth;
      highest_nodes = [target_node];
      continue;
    }

    highest_nodes.push(target_node);
  }

  return highest_nodes;
}

/*
Given { A: { arrow: "k", .. }, ... }
Gives { A: "k", ... }
*/
const extract_arrows = transition_requests => {
  let arrows = {};
  for (node in transition_requests) {
    arrows[node] = transition_requests[node].arrow
  }
  return arrows;
}

const extract_contexts = transition_requests => {
  let contexts = [];
  for (node in transition_requests) {
    contexts.push(transition_requests[node].context);
  }

  return contexts;
}

const get_transition_actions = (flat_desc, transition_requests) => {
  let before_fns = []
  let after_fns = []
  for (node_name in transition_requests) {
    const arrow = transition_requests[node_name].arrow
    transition_desc = flat_desc[node_name].transitions[arrow]
    if(!transition_desc) {
      continue
    }

    before_fns.push(transition_desc.before_transition)
    after_fns.push(transition_desc.after_transition)
  }

  const chain_fns = fns => async function () {
    if (!fns.length) {
      return;
    }

    const head = fns.slice(0, 1)[0]
    const tail = fns.slice(1)
    await Promise.resolve(head())
    return chain_fns(tail)
  }

  return {
    before: chain_fns(before_fns),
    after: chain_fns(after_fns)
  }
}

const add_nodes_ids = state => {
  let nodes_ids = {};
  for(let node of state.nodes) {
    nodes_ids[node] = uuid.v1();
  }

  return Object.assign(state, {nodes_ids: nodes_ids})
}

const get_next_state = (desc, state, transition_requests) => {
  const flat_desc = flatten(desc, state.history);
  const arrow_by_node = extract_arrows(transition_requests);

  const nodes_after_following_arrows = state.nodes.map(node => {
    const dest = shallow_follow_arrow(node, flat_desc, arrow_by_node);
    return dest ? dest : node;
  })

  const highest_nodes = leave_highest_nodes(flat_desc, nodes_after_following_arrows);
  const deepest_nodes = follow_arrow(flat_desc, highest_nodes);

  const history = Object.assign({}, state.history, extract_current_history(
    flat_desc,
    follow_arrow(
      flat_desc,
      nodes_after_following_arrows
    )
  ));

  const new_context = merge_contexts([state.context, ...extract_contexts(transition_requests)]);

  const next_state = add_nodes_ids({
    nodes: deepest_nodes,
    history,
    context: new_context
  })

  const transition_actions = get_transition_actions(flat_desc, transition_requests)

  return [next_state, transition_actions]
};

const get_node_prototype = (desc, node_name, state, transition_requests) => {
  const flatten_desc = flatten(desc, {})[node_name]
  const raw_node_proto = flatten_desc.prototype
  return Object.assign({}, raw_node_proto, {

    id: state.nodes_ids[node_name],

    context: flatten_desc.map_ctx_in(state.context),

    transition (arrow, provided_context) {
      transition_requests[node_name] = {
        arrow: arrow,
        context: provided_context ? flatten_desc.map_ctx_out(provided_context) : state.context
      };

    }
  })
}

module.exports = { get_next_state, extract_current_history, add_nodes_ids, get_node_prototype };
