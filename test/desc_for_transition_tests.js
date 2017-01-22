const test_node = {
  type: "prototype",
  follow(path) {
    return this.transition(path);
  }
};

const CB = {
  type: "machine",
  entry_point: "CBB",
  states: [
    ["CBA", test_node, {
      m: "CBB"
    }],
    ["CBB", test_node, {
      k: "CBA"
    }]
  ]
};

const CA = {
  type: "machine",
  history: true,
  entry_point: "CAB",
  states: [
    ["CAA", test_node, {
      j: "CAB"
    }],
    ["CAB", test_node, {
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
    ["A", test_node, {
      a: "B",
      c: "C"
    }],
    ["B", test_node, {
      b: "A",
      e: "C"
    }],
    ["C", C, {
      d: "B"
    }]
  ]
};

module.exports = { desc: root, node: test_node };
