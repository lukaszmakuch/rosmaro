const merge_contexts = require('./context').merge;

//turns a nested description into a flat one, taking the history into account
const flatten = (desc, hist) => {
  let flat = {};
  let transitions = {};

  var i = 0;

  const visit = (name, desc, hist, so_far, depth) => {

    let common_part = so_far.filter(a => a);
    let composed_name = common_part.concat([name]).join(":");
    let composer_parent_name = common_part.join(":");
    composer_parent_name = (composer_parent_name) ? composer_parent_name : undefined;

    switch(desc.type) {

      case "prototype":
        flat[composed_name] = {
          depth: depth,
          type: "leaf",
          prototype: desc,
          parent: composer_parent_name,
          transitions: {}
        }
      break;

      case "machine":

        entry_point = desc.history && hist[composed_name]
          ? hist[composed_name]
          : common_part.concat([name, desc.entry_point]).join(":");

          if (composed_name) {
            flat[composed_name] = {
              depth: depth,
              type: "machine",
              transitions: {},
              parent: composer_parent_name,
              entry_point: entry_point
            }
          }

        for (const [child_name, child_desc, child_transitions] of desc.states) {

          const full_name = common_part.concat([name, child_name]).filter(a => a).join(":");

          transitions[full_name] = {};
          for (const ev in child_transitions) {
            const target_name = child_transitions[ev];
            const full_target_name = common_part.concat([name, target_name]).filter(a => a).join(":");
            transitions[full_name][ev] = full_target_name;
          }

          visit(
            child_name,
            child_desc,
            hist,
            so_far.concat([name]),
            depth + 1
          );

        }
      break;

      case "composite":

        let common = so_far.filter(a => a).concat([name]);

        if(composed_name) {
          flat[composed_name] = {
            depth: depth,
            transitions: {},
            type: "composite",
            parent: composer_parent_name,
            children: desc.states
            .map(name_and_model => common.concat([name_and_model[0]]).join(":"))
          }

        }

        for (const [child_name, child_desc] of desc.states) {
          visit(
            child_name,
            child_desc,
            hist,
            so_far.concat([name]),
            depth + 1
          );
        }

      break;
    }

  };

  visit(undefined, desc, hist, [], -1);
  for (const node in transitions) {
    flat[node]["transitions"] = transitions[node];
  }

  return flat;
};

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
  const arrow_from_it = flat_desc[node]["transitions"][arrow_by_node[node]];
  if (arrow_from_it) {
    return arrow_from_it;
  }

  if (flat_desc[node].parent) {
    const parent = flat_desc[node].parent;
    return shallow_follow_arrow(
      parent,
      flat_desc,
      Object.assign({}, arrow_by_node, {[parent]: arrow_by_node[node]})
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

  const new_context = merge_contexts(extract_contexts(transition_requests));

  return {
    nodes: deepest_nodes,
    history,
    context: new_context
  }
};

const get_entry_points = desc => {
  switch (desc.type) {
    case 'machine':
      return [desc.entry_point]
    case 'composite':
      return desc.states.map(name_and_desc => name_and_desc[0])
    default:
      return [];
  }
}

const get_initial_nodes_as_array = (desc, name = "") => {
  switch (desc.type) {
    case 'machine':
      var child_res = get_initial_nodes_as_array(
        desc.states.filter(state_desc => state_desc[0] == desc.entry_point)[0][1],
        desc.entry_point
      )
    break;
    case 'composite':
      var child_res = desc.states
        .map(state_desc => get_initial_nodes_as_array(state_desc[1], state_desc[0]))
        .reduce((so_far, res) => so_far.concat(res), [])
    break;
    case 'prototype':
      var child_res = [[]]
    break;
  }

  const curr = [[name]]

  let res = [];
  for (let child_row of child_res) {
    res.push([name].concat(child_row))
  }

  return res
}

const get_initial_nodes = desc =>
  get_initial_nodes_as_array(desc, "")
  .map(state_parts => state_parts.filter(a => a).join(":"))

const get_node_prototype = (desc, node) => {
  return flatten(desc, {})[node].prototype;
}

module.exports = { flatten, get_next_state, extract_current_history, get_initial_nodes, get_node_prototype };
