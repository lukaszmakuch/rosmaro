const assert = require('assert')
const r = require('./get_in_memory_rosmaro')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock_mock = require('./lock_test_double')

describe("composite", function () {

  it("allows many transitions within left nodes", async function () {

    const A = {
      on_entry() {
        this.follow("e")
      }
    }

    const BA = {
      x() {
        this.follow("x")
      }
    }

    const BB = {
      type: "graph",
      start: "A",
      arrows: {
        A: { x: "B" },
        B: { e: "C" },
        C: { e: "D" },
        D: {}
      },
      nodes: {
        A: {
          x() {
            this.follow("x")
          }
        },
        B: {
          on_entry() {
            this.follow("e")
          }
        },
        C: {
          on_entry() {
            this.follow("e")
          }
        },
        D: {}
      }
    }

    const B = {
      type: "composite",
      nodes: [
        ["A", BA],
        ["B", BB]
      ]
    }

    const model = r({
      type: "graph",
      start: "B",
      arrows: {
        A: { e: "B" },
        B: { x: "A" }
      },
      nodes: { A, B }
    })

    await model.x()

    const nodes = await model.nodes
    assert.deepEqual(["B:A", "B:B:D"], nodes)

  })

  it("allows leaving a composite to nodes on different levels", async function () {

    let log = []

    const A = {
      on_entry() {
        log.push("entered A")
      }
    }

    const BA = {
      on_entry() {
        log.push("entered BA")
      },
    }

    const BBA = {
      follow_arrow() {
        this.follow("x")
      }
    }

    const BBB = {
      follow_arrow() {
        this.follow("y")
      }
    }

    const BB = {
      type: "composite",
      nodes: [
        ["BBA", BBA],
        ["BBB", BBB]
      ]
    }

    const B = {
      type: "graph",
      start: "BB",
      arrows: {
        BB: { x: "BA" }
      },
      nodes: { BA, BB }
    }

    const root = {
      type: "graph",
      start: "B",
      arrows: {
        B: { y: "A" }
      },
      nodes: { A, B }
    }

    const model = r(root)
    await model.follow_arrow()

    assert.deepEqual(log, ["entered BA", "entered A"])
  })

  it("allows transitions on different levels", async function () {

    var entered_BBB = false

    const model = r({
      type: "graph",
      start: "B",
      arrows: {
        A: { a: "B" },
        B: { a: "A" }
      },
      nodes: {
        A: {
          follow_arrow() {
            this.follow("a")
          }
        },
        B: {
            type: "composite",
            nodes: [

            ["A", {
              follow_arrow() {
                this.follow("a")
              }
            }],

            ["B", {
              type: "graph",
              start: "A",
              arrows: {
                A: { a: "B" }
              },
              nodes: {
                A: {
                  follow_arrow() {
                    this.follow("a")
                  }
                },
                B: {
                  on_entry() {
                    entered_BBB = true
                  }
                }
              }
            }]

          ]
        }
      }
    })

    await model.follow_arrow()
    const nodes1 = await model.nodes

    assert.deepEqual(["A"], nodes1)
    assert.equal(entered_BBB, true)

    await model.follow_arrow()
    const nodes2 = await model.nodes
    assert.deepEqual(["B:A", "B:B:B"], nodes2)

  })

  it("doesn't allow to enter an invalid state", async function () {

    const model = build_rosmaro({
      type: "graph",
      start: "C",
      arrows: {
        C: {
          x: "A",
          y: "B"
        }
      },
      nodes: {
        A: {},
        B: {},
        C: {
          type: "composite",
          nodes: [
            ["A", {
              follow_arrow() {
                this.follow("x")
              }
            }],

            ["B", {
              follow_arrow() {
                this.follow("y")
              }
            }],
          ]
        }
      }
    }, build_storage(), lock_mock().lock)

    let thrown = []
    try { await model.follow_arrow() } catch (e) { thrown.push(e) }
    try { await model.follow_arrow() } catch (e) { thrown.push(e) }
    assert.deepEqual(
      [
        new Error('transition to an invalid state ["",""]from ["A","B"]'),
        new Error('transition to an invalid state ["",""]from ["A","B"]')
      ],
      thrown
    )
  })

  it("calls nodes in the same order as they appear on the list", async function () {

    let log = []

    const model = r({
      type: "composite",
      nodes: [

        ["A", {
          writeOn(log) {
            log.push("A")
          }
        }],

        ["B", {
          writeOn(log) {
            log.push("B")
          }
        }],

        ["C", {
          writeOn(log) {
            log.push("C")
          }
        }],

      ]
    })

    await model.writeOn(log)

    assert.deepEqual(["A", "B", "C"], log)

  })

  it("allows one of the composed nodes to stay the same", async function () {

    const model = r({
      type: "graph",
      start: "A",
      arrows: {
        A: { arrow: "B" }
      },
      nodes: {
        A: {
          type: "composite",
          nodes: [
            ["A", {}],
            ["B", {
              follow_arrow() {
                this.follow("arrow")
              }
            }]
          ]
        },
        B: {}
      }
    })

    await model.follow_arrow()

  })

})
