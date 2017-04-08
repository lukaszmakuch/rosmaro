const test_node = {
  follow(path) {
    return this.follow(path);
  }
};

const CB = {
  type: "graph",
  start: "CBB",
  arrows: {
    CBA: { m: "CBB" },
    CBB: { k: "CBA" }
  },
  nodes: {
    CBA: test_node,
    CBB: test_node
  }
};

const CA = {
  type: "graph",
  start: "CAB",
  arrows: {
    CAA: { j: "CAB" },
    CAB: { k: "CAB" }
  },
  nodes: {
    CAA: test_node,
    CAB: test_node
  }
}

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
  nodes: {
    A: test_node,
    B: test_node,
    C
  }
};

module.exports = { desc: root, node: test_node };
