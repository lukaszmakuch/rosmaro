const build_leaving_transitions_mapping_fn = map => from => map[from];

/*

given: "abc"
gives {
  next_state_name: "abc",
  before_transition: fn,
  after_transition: fn
}

given: [fn, fn, next_state_name, fn]
gives: {
  next_state_name: next_state_name,
  before_transition: fn,
  after_transition: fn
}

*/
const flatten_transition_desc = transition_desc => {
  if (typeof transition_desc === 'string') {
    return {
      next_state_name: transition_desc,
      before_transition: async () => {},
      after_transition: async () => {}
    }
  }

  //if it's just a string, then
  return transition_desc.reduce((flat_transition_desc, part) => {
    //it's the name of the next state
    if (typeof part === 'string') {
      return Object.assign({}, flat_transition_desc, {
        next_state_name: part
      })
    //it's some transition action
    } else if (typeof part === 'function') {
      const get_with_merged_fn = fn_name => Object.assign({}, flat_transition_desc, {
        [fn_name]: async () => {
          await Promise.resolve(flat_transition_desc[fn_name]())
          return part()
        }
      })
      //it's a before transition action
      if (!flat_transition_desc["next_state_name"]) {
        return get_with_merged_fn("before_transition")
      //it's an after transition action
      } else {
        return get_with_merged_fn("after_transition")
      }
    }
  }, {
    before_transition: () => {},
    after_transition: () => {},
  })
}

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
          ctx => map_ctx_out(desc.map_output_context(ctx)),
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
            const child_transition = flatten_transition_desc(child_transitions[ev]);

            const full_target_name = common_part
              .concat([name, child_transition.next_state_name])
              .filter(a => a)
              .join(":")

            transitions[full_name][ev] = Object.assign({}, child_transition, {
              next_state_name: full_target_name
            });
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
