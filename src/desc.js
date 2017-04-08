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

//turns a nested description into a flat one
const flatten = desc => {
  let flat = {};
  let transitions = {};
  let mapping_fns = {};
  var i = 0;

  const visit = (name, desc, so_far, depth, map_ctx_in, map_ctx_out, map_leaving_arrows) => {
    let common_part = so_far.filter(a => a);
    let composed_name = common_part.concat([name]).join(":");
    let composed_parent_name = common_part.join(":");
    composed_parent_name = composed_parent_name ? composed_parent_name : '';
    switch(desc.type) {

      case undefined: //a leaf
        flat[composed_name] = {
          depth: depth,
          type: "leaf",
          prototype: desc,
          parent: composed_parent_name,
          transitions: {},
          map_ctx_in,
          map_ctx_out,
          map_leaving_arrows
        }
      break;

      case "adapter":

        const arrow_mapping_fn = arrow =>  desc.rename_leaving_arrows[arrow]
            ? desc.rename_leaving_arrows[arrow]
            : arrow;

        visit(
          name,
          desc.adapted,
          so_far,
          depth,
          ctx => desc.map_entering_context(map_ctx_in(ctx)),
          ctx => map_ctx_out(desc.map_leaving_context(ctx)),
          arrow_mapping_fn
        );

      break;

      case "graph":

        initial_node = common_part.concat([name, desc.start]).join(":");

        if (composed_name) {
          flat[composed_name] = {
            map_ctx_in,
            map_ctx_out,
            map_leaving_arrows,
            depth: depth,
            type: "graph",
            transitions: {},
            parent: composed_parent_name,
            initial_node
          }
        }

        for (const child_name in desc.nodes) {
          const child_desc = desc.nodes[child_name]
          const child_transitions = desc.arrows[child_name]

          const full_name = common_part.concat([name, child_name]).filter(a => a).join(":")

          transitions[full_name] = {};
          for (const ev in child_transitions) {
            const child_transition = flatten_transition_desc(child_transitions[ev])

            const full_target_name = common_part
            .concat([name, child_transition.next_state_name])
            .filter(a => a)
            .join(":")

            transitions[full_name][ev] = Object.assign({}, child_transition, {
              next_state_name: full_target_name
            })
          }

          visit(
            child_name,
            child_desc,
            so_far.concat([name]),
            depth + 1,
            map_ctx_in,
            map_ctx_out,
            map_leaving_arrows
          )
        }

      break;

      case "composite":

        let common = so_far.filter(a => a).concat([name]);

        flat[composed_name] = {
          map_ctx_in,
          map_ctx_out,
          map_leaving_arrows,
          depth: depth,
          transitions: {},
          type: "composite",
          parent: composed_parent_name,
          children: desc.nodes.map(name_and_model => common.concat([name_and_model[0]]).filter(a => a).join(":"))
        }

        for (const [child_name, child_desc] of desc.nodes) {
          visit(
            child_name,
            child_desc,
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

  visit(undefined, desc, [], -1, a => a, a => a, a => a);
  for (const node in transitions) {
    flat[node]["transitions"] = transitions[node];
  }

  return flat;
};

const get_initial_nodes_as_array = (desc, name = "") => {
  switch (desc.type) {
    case 'graph':
      var child_res = get_initial_nodes_as_array(
        desc.nodes[desc.start],
        desc.start
      )
    break;
    case 'adapter':
      var child_res = get_initial_nodes_as_array(
        desc.adapted,
        name
      )
    break;
    case 'composite':
      var child_res = desc.nodes
        .map(state_desc => get_initial_nodes_as_array(state_desc[1], state_desc[0]))
        .reduce((so_far, res) => so_far.concat(res), [])
    break;
    case undefined: //a leaf
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
