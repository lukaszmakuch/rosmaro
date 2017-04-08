
const assert = require('assert');
const build_storage = require('./storage_test_double');
const build_rosmaro = require('./../src/rosmaro');
const lock_mock = require('./lock_test_double')

describe("transitions", function () {

  async function assert_transitions (rosmaro_desc, expected_transitions) {

    //the storage is common for all operations
    const storage = build_storage();

    for (const [action, expected_nodes] of expected_transitions) {

      //for every operation, we can use a new Rosmaro instance, because
      //all mutable state should be held by the storage
      const rosmaro = build_rosmaro(rosmaro_desc, storage, lock_mock().lock);

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
      a() { return this.follow("a"); },
      b() { return this.follow("b"); },
      c() { return this.follow("c"); },
      d() { return this.follow("d"); },
      e() { return this.follow("e"); },
      j() { return this.follow("j"); },
      k() { return this.follow("k"); },
      m() { return this.follow("m"); }
    };

    const CB = {
      type: "graph",
      start: "CBB",
      arrows: {
        CBA: { m: "CBB" },
        CBB: { k: "CBA"}
      },
      nodes: { CBA: test_state, CBB: test_state }
    };

    const CA = {
      type: "graph",
      start: "CAB",
      arrows: {
        CAA: { j: "CAB" },
        CAB: { k: "CAA" }
      },
      nodes: { CAA: test_state, CAB: test_state }
    };

    const C = {
      type: "composite",
      nodes: [["CA", CA], ["CB", CB]]
    };

    const root = {
      type: "graph",
      start: "C",
      arrows: {
        A: {
          a: "B",
          c: "C"
        },
        B: {
          b: "A",
          e: "C"
        },
        C: {
          d: "B"
        }
      },
      nodes: { A: test_state, B: test_state, C }
    }

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
      let proto = {};
      for (const action in actions_to_events) {
        proto[action] = function () {
          return this.follow(actions_to_events[action])
        }
      }
      return proto;
    }

    const A = {
      type: "graph",
      start: "A1",
      arrows: {
        A1: {
          x: "A2"
        }
      },
      nodes: {
        A1: make_node({"x_from_A1": "x"}),
        A2: make_node({})
      }
    }

    const B = {
      type: "graph",
      start: "B1",
      arrows: {
        B1: {
          x: "B2"
        }
      },
      nodes: { B1: make_node({"x_from_B1": "x"}), B2: make_node({}) }
    }

    const root_with_concurrent_states = {
      type: "composite",
      nodes: [["A", A], ["B", B]]
    };

    return assert_transitions(root_with_concurrent_states, [
      [null, ["A:A1", "B:B1"]],
      ["x_from_A1", ["A:A2", "B:B1"]],
      ["x_from_B1", ["A:A2", "B:B2"]],
    ]);

  });

});
