
const extract_current_history_deep = (flat_desc, state) =>
{

  const parents = state
    .map(node => flat_desc[node].parent)
    .filter(a => a);

  const with_parent_as_key = node_id => ({ [flat_desc[node_id].parent]: node_id });
  const is_machine = node_id => flat_desc[flat_desc[node_id].parent].type === "machine";

  return state
    .filter(node_id => flat_desc[node_id].parent)
    .filter(is_machine)
    .map(with_parent_as_key)
    .concat(parents.length > 0 ? extract_current_history(flat_desc, parents) : [])
};

const extract_current_history = (flat_desc, state) =>
  Object.assign.apply({}, [{}, ...extract_current_history_deep(flat_desc, state)])

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

const follow_arrow = (flat_desc, targets) => {
  var expanded_targets = [];
  var changed = false;
  for (let one_target of targets) {
    switch (flat_desc[one_target].type) {
      case 'leaf':
        expanded_targets.push(one_target);
        break;
      case 'composite':
        expanded_targets = expanded_targets.concat(flat_desc[one_target].children);
        changed = true;
        break;
      case 'machine':
        expanded_targets.push(flat_desc[one_target].entry_point);
        changed = true;
    }
  }

  return changed ? follow_arrow(flat_desc, expanded_targets) : targets;
}

const shallow_follow_arrow = (node_state, flat_desc, events) => {
  const arrow_from_it = flat_desc[node_state]["transitions"][events[node_state]];
  if (arrow_from_it) {
    return arrow_from_it;
  }

  if (flat_desc[node_state].parent) {
    const parent = flat_desc[node_state].parent;
    return shallow_follow_arrow(
      parent,
      flat_desc,
      Object.assign({}, events, {[parent]: events[node_state]})
    )
  }

}

const leave_highest_nodes = (flat_desc, state_change_desc) => {

  var highest_node_index = undefined;
  var highest_nodes = [];

  for (let single_change_desc of state_change_desc) {
    const target_node = single_change_desc.to;
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

const origin_as_destination_if_empty = change_desc => {
  if (!change_desc.to) {
    return Object.assign({}, change_desc, {to: change_desc.from});
  }

  return change_desc;
}

const get_next_state = (desc, state, hist, events) => {
  const flat_desc = flatten(desc, hist);

  const followed_arrows = state.map(node_state => ({
    from: node_state,
    to: shallow_follow_arrow(node_state, flat_desc, events)
  })).map(origin_as_destination_if_empty)

  const highest_nodes = leave_highest_nodes(flat_desc, followed_arrows);
  const new_state = follow_arrow(
    flat_desc,
    leave_highest_nodes(flat_desc, followed_arrows)
  );

  const history = Object.assign({}, hist, extract_current_history(
    flat_desc,
    follow_arrow(
      flat_desc,
      followed_arrows.map(arrow => arrow.to)
    )
  ));

  return { state: new_state, history }
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

const get_initial_state_arr = (desc, name = "") => {
  switch (desc.type) {
    case 'machine':
      var child_res = get_initial_state_arr(
        desc.states.filter(state_desc => state_desc[0] == desc.entry_point)[0][1],
        desc.entry_point
      )
    break;
    case 'composite':
      var child_res = desc.states
        .map(state_desc => get_initial_state_arr(state_desc[1], state_desc[0]))
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


const get_initial_state = desc =>
  get_initial_state_arr(desc, "")
  .map(state_parts => state_parts.filter(a => a).join(":"))


const get_node_prototype = (desc, node) => {
  return flatten(desc, {})[node].prototype;
}

module.exports = { flatten, get_next_state, extract_current_history, get_initial_state, get_node_prototype };
