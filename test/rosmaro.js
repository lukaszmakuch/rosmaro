const assert = require('assert');
const build_storage = require('./../src/in_memory_storage');
const build_rosmaro = require('./../src/rosmaro');
const lock = require('./lock_test_double')().lock

describe("transitions", function () {

  async function assert_transitions (rosmaro_desc, expected_transitions) {

    //the storage is common for all operations
    const storage = build_storage();

    for (const [action, expected_nodes] of expected_transitions) {

      //for every operation, we can use a new Rosmaro instance, because
      //all mutable state should be held by the storage
      const rosmaro = build_rosmaro("it's id", rosmaro_desc, storage, lock);

      //we want to check the initial state too, so we don't perform the transition
      if (action) {
        await rosmaro[action]();
      }

      const actual_nodes = await rosmaro.nodes;
      assert.deepEqual(expected_nodes, actual_nodes);
    }
  }

  it("allows transitions between states on the same level", function () {

    const test_state = {
      type: "prototype",
      a() { return this.transition("a"); },
      b() { return this.transition("b"); },
      c() { return this.transition("c"); },
      d() { return this.transition("d"); },
      e() { return this.transition("e"); },
      j() { return this.transition("j"); },
      k() { return this.transition("k"); },
      m() { return this.transition("m"); }
    };

    const CB = {
      type: "machine",
      entry_point: "CBB",
      states: [
        ["CBA", test_state, {
          m: "CBB"
        }],
        ["CBB", test_state, {
          k: "CBA"
        }]
      ]
    };

    const CA = {
      type: "machine",
      entry_point: "CAB",
      states: [
        ["CAA", test_state, {
          j: "CAB"
        }],
        ["CAB", test_state, {
          k: "CAA"
        }]
      ]
    };

    const C = {
      type: "composite",
      states: [["CA", CA], ["CB", CB]]
    };

    const root = {
      type: "machine",
      entry_point: "C",
      states: [
        ["A", test_state, {
          a: "B",
          c: "C"
        }],
        ["B", test_state, {
          b: "A",
          e: "C"
        }],
        ["C", C, {
          d: "B"
        }]
      ]
    };

    return assert_transitions(root, [
      [null, ["C:CA:CAB", "C:CB:CBB"]],
      ["k", ["C:CA:CAA", "C:CB:CBA"]],
      ["d", ["B"]],
      ["b", ["A"]],
      ["c", ["C:CA:CAA", "C:CB:CBA"]]
    ]);

  });

  it("allows independent transitions in concurrent states", function () {
    const make_node = actions_to_events => {
      let proto = {type: "prototype"};
      for (const action in actions_to_events) {
        proto[action] = function () {
          return this.transition(actions_to_events[action])
        }
      }
      return proto;
    }

    const A = {
      type: "machine",
      entry_point: "A1",
      states: [
        ["A1", make_node({"x_from_A1": "x"}), {
          "x": "A2"
        }],
        ["A2", make_node({}), {}],
      ]
    }

    const B = {
      type: "machine",
      entry_point: "B1",
      states: [
        ["B1", make_node({"x_from_B1": "x"}), {
          "x": "B2"
        }],
        ["B2", make_node({}), {}],
      ]
    }

    const root_with_concurrent_states = {
      type: "composite",
      states: [["A", A], ["B", B]]
    };

    return assert_transitions(root_with_concurrent_states, [
      [null, ["A:A1", "B:B1"]],
      ["x_from_A1", ["A:A2", "B:B1"]],
      ["x_from_B1", ["A:A2", "B:B2"]],
    ]);

  });

});
