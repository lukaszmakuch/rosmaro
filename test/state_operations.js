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

describe("getting the next state", function () {

  it ("gets the next state with it's new history", function () {

    const current_state = ["B"];
    const current_history = {"a": "b"}

    const expected_new_state = ["C:CA:CAB", "C:CB:CBB"];
    const expected_new_history = {"a": "b", "C:CA": "C:CA:CAB", "C:CB": "C:CB:CBB"};

    const events = {"B": "e"};
    const new_state = state_operations.get_next_state(desc, current_state, current_history, events);

    assert.deepEqual(
      {
        state: expected_new_state,
        history: expected_new_history
      },
      new_state
    );

  });

  it ("allows to travel the hierarchy up", function () {

    const current_state = ["C:CA:CAB", "C:CB:CBB"];
    const current_history = {};

    const events = {"C:CA:CAB": "k", "C:CB:CBB": "d"};

    const expected_new_state = ["B"];
    const epected_new_history = {"C:CA": "C:CA:CAA"}

    assert.deepEqual(
      {
        state: expected_new_state,
        history: epected_new_history
      },
      state_operations.get_next_state(desc, current_state, current_history, events)
    )

  })

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

describe("getting the initial state", function () {
  it ("is based only on the description of the whole Rosmaro", function () {

    assert.deepEqual(
      ["C:CA:CAB", "C:CB:CBB"],
      state_operations.get_initial_state(desc)
    )

  });
});

describe("getting a node prototype", function () {

  const expected_prototype = desc.states[2][1].states[0][1].states[0][1];
  const node = "C:CA:CAA";
  const got_prototype = state_operations.get_node_prototype(desc, node);

  assert.strictEqual(expected_prototype, got_prototype);

});
