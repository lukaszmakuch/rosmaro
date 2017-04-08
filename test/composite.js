const assert = require('assert')
const r = require('./get_in_memory_rosmaro')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock_mock = require('./lock_test_double')

describe("composite", function () {

  it("allows many transactions within left nodes", async function () {

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
        'transition to an invalid state ["",""]from ["A","B"]',
        'transition to an invalid state ["",""]from ["A","B"]'
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

})
