const assert = require('assert');
const state_operations = require('./../src/state_operations');
var {desc, node} = require('./desc_for_transition_tests');

describe("flattening rosmaro description", function () {

  it ("converts a tree structure into a flat structure", function () {

    const flattened = state_operations.flatten(desc, {});
    const expected = {
      "A": {
        depth: 0,
        type: "leaf",
        prototype: node,
        parent: undefined,
        transitions: {
          "a": "B",
          "c": "C"
        }
      },
      "B": {
        depth: 0,
        type: "leaf",
        prototype: node,
        parent: undefined,
        transitions: {
          "e": "C",
          "b": "A"
        }
      },
      "C": {
        depth: 0,
        type: "composite",
        parent: undefined,
        children: ["C:CA", "C:CB"],
        transitions: {
          "d": "B"
        }
      },
      "C:CA": {
        depth: 1,
        type: "machine",
        parent: "C",
        entry_point: "C:CA:CAB",
        transitions: {}
      },
      "C:CB": {
        depth: 1,
        type: "machine",
        parent: "C",
        entry_point: "C:CB:CBB",
        transitions: {}
      },
      "C:CA:CAA": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CA",
        transitions: {
          "j": "C:CA:CAB"
        }
      },
      "C:CA:CAB": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CA",
        transitions: {
          "k": "C:CA:CAA"
        }
      },
      "C:CB:CBA": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CB",
        transitions: {
          "m": "C:CB:CBB"
        }
      },
      "C:CB:CBB": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CB",
        transitions: {
          "k": "C:CB:CBA"
        }
      },
    }

    assert.deepEqual(expected, flattened);
  });

  it("takes history into account", function () {
    const history = {
      "C:CA": "C:CA:CAA",
      //won't be taken into account, because C:CB has no history: true
      "C:CB": "C:CB:CBA"
    }
    const flattened = state_operations.flatten(desc, history);
    const expected = {
      "A": {
        depth: 0,
        type: "leaf",
        prototype: node,
        parent: undefined,
        transitions: {
          "a": "B",
          "c": "C"
        }
      },
      "B": {
        depth: 0,
        type: "leaf",
        prototype: node,
        parent: undefined,
        transitions: {
          "e": "C",
          "b": "A"
        }
      },
      "C": {
        depth: 0,
        type: "composite",
        parent: undefined,
        children: ["C:CA", "C:CB"],
        transitions: {
          "d": "B"
        }
      },
      "C:CA": {
        depth: 1,
        type: "machine",
        parent: "C",
        entry_point: "C:CA:CAA",
        transitions: {}
      },
      "C:CB": {
        depth: 1,
        type: "machine",
        parent: "C",
        //history isn't taken into account, because C:CB has no history: true
        entry_point: "C:CB:CBB",
        transitions: {}
      },
      "C:CA:CAA": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CA",
        transitions: {
          "j": "C:CA:CAB"
        }
      },
      "C:CA:CAB": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CA",
        transitions: {
          "k": "C:CA:CAA"
        }
      },
      "C:CB:CBA": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CB",
        transitions: {
          "m": "C:CB:CBB"
        }
      },
      "C:CB:CBB": {
        depth: 2,
        type: "leaf",
        prototype: node,
        parent: "C:CB",
        transitions: {
          "k": "C:CB:CBA"
        }
      },
    }

    assert.deepEqual(expected, flattened);
  });
});

describe("extracting current history", function () {
  it("follows parents of the current state", function () {

    const state = ["a:a:a"];

    const flat_desc = {
      "a:a:a": {
        type: "leaf",
        parent: "a:a"
      },
      "a:a": {
        type: "machine",
        parent: "a"
      },
      "a": {
        type: "machine",
        parent: undefined
      }
    };

    const expected_new_history = {
      "a:a": "a:a:a",
      "a": "a:a"
    }

    assert.deepEqual(
      expected_new_history,
      state_operations.extract_current_history(flat_desc, state)
    )

  });
})

describe("getting initial nodes", function () {
  it ("is based only on the description of the whole Rosmaro", function () {

    assert.deepEqual(
      ["C:CA:CAB", "C:CB:CBB"],
      state_operations.get_initial_nodes(desc)
    )

  });
});

describe("getting a node prototype", function () {

  const expected_prototype = desc.states[2][1].states[0][1].states[0][1];
  const node = "C:CA:CAA";
  const got_prototype = state_operations.get_node_prototype(desc, node);

  assert.strictEqual(expected_prototype, got_prototype);

});
