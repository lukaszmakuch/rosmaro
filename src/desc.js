const build_leaving_transitions_mapping_fn = map => from => map[from];



//turns a nested description into a flat one, taking the history into account
const flatten = (desc, hist) => {
  let flat = {};
  let transitions = {};
  let mapping_fns = {};
  var i = 0;

  const visit = (name, desc, hist, so_far, depth, map_ctx_in, map_ctx_out, map_leaving_transitions) => {
    let common_part = so_far.filter(a => a);
    let composed_name = common_part.concat([name]).join(":");
    let composer_parent_name = common_part.join(":");
    composer_parent_name = composer_parent_name ? composer_parent_name : undefined;
    switch(desc.type) {

      case "prototype":
        flat[composed_name] = {
          depth: depth,
          type: "leaf",
          prototype: desc,
          parent: composer_parent_name,
          transitions: {},
          map_ctx_in,
          map_ctx_out,
          map_leaving_transitions
        }
      break;

      case "adapter":

        const arrow_mapping_fn = arrow =>  desc.rename_leaving_transitions[arrow]
            ? desc.rename_leaving_transitions[arrow]
            : arrow;

        visit(
          name,
          desc.adapted,
          hist,
          so_far,
          depth,
          ctx => desc.map_input_context(map_ctx_in(ctx)),
          ctx => desc.map_output_context(map_ctx_out(ctx)),
          arrow_mapping_fn
        );

      break;

      case "machine":

        entry_point = desc.history && hist[composed_name]
          ? hist[composed_name]
          : common_part.concat([name, desc.entry_point]).join(":");

          if (composed_name) {
            flat[composed_name] = {
              map_ctx_in,
              map_ctx_out,
              map_leaving_transitions,
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
            depth + 1,
            map_ctx_in,
            map_ctx_out,
            map_leaving_transitions
          );

        }
      break;

      case "composite":

        let common = so_far.filter(a => a).concat([name]);

        if(composed_name) {
          flat[composed_name] = {
            map_ctx_in,
            map_ctx_out,
            map_leaving_transitions,
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
            depth + 1,
            map_ctx_in,
            map_ctx_out,
            a => a
          );
        }

      break;
    }

  };

  visit(undefined, desc, hist, [], -1, a => a, a => a, a => a);
  for (const node in transitions) {
    flat[node]["transitions"] = transitions[node];
  }

  return flat;
};

const get_initial_nodes_as_array = (desc, name = "") => {
  switch (desc.type) {
    case 'machine':
      var child_res = get_initial_nodes_as_array(
        desc.states.filter(state_desc => state_desc[0] == desc.entry_point)[0][1],
        desc.entry_point
      )
    break;
    case 'adapter':
      var child_res = get_initial_nodes_as_array(
        desc.adapted,
        name
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

module.exports = { flatten, get_initial_nodes }
