const assert = require('assert')
const r = require('./get_in_memory_rosmaro')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock_mock = require('./lock_test_double')

describe("composite", function () {

  it("allows many transactions withing left nodes", async function () {

    const A = {
      type: "prototype",
      on_entry() {
        this.transition("e")
      }
    }

    const BA = {
      type: "prototype",
      x() {
        this.transition("x")
      }
    }

    const BB = {
      type: "machine",
      entry_point: "A",
      states: [

        ["A", {
          type: "prototype",
          x() {
            this.transition("x")
          }
        }, {x: "B"}],

        ["B", {
          type: "prototype",
          on_entry() {
            this.transition("e")
          }
        }, {e: "C"}],

        ["C", {
          type: "prototype",
          on_entry() {
            this.transition("e")
          }
        }, {e: "D"}],

        ["D", {
          type: "prototype"
        }, {}],

      ]
    }

    const B = {
      type: "composite",
      states: [
        ["A", BA],
        ["B", BB]
      ]
    }

    const model = r({
      type: "machine",
      entry_point: "B",
      states: [
        ["A", A, {e: "B"}],
        ["B", B, {x: "A"}]
      ]
    })

    await model.x()

    const nodes = await model.nodes
    assert.deepEqual(["B:A", "B:B:D"], nodes)

  })

  it("allows transitions on different levels", async function () {

    var entered_BBB = false

    const model = r({
      type: "machine",
      entry_point: "B",
      states: [

        ["A", {
          type: "prototype",
          follow_arrow() {
            this.transition("a")
          }
        }, {a: "B"}],

        ["B", {
          type: "composite",
          states: [

            ["A", {
              type: "prototype",
              follow_arrow() {
                this.transition("a")
              }
            }],

            ["B", {
              type: "machine",
              entry_point: "A",
              states: [

                ["A", {
                  type: "prototype",
                  follow_arrow() {
                    this.transition("a")
                  }
                }, {a: "B"}],

                ["B", {
                  type: "prototype",
                  on_entry() {
                    entered_BBB = true
                  }
                }, {}]

              ]
            }]

          ]
        }, {a: "A"}]

      ]
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
      type: "machine",
      entry_point: "C",
      states: [

        ["A", { type: "prototype" }, {}],

        ["B", { type: "prototype" }, {}],

        ["C", {
          type: "composite",
          states: [

            ["A", {
              type: "prototype",
              follow_arrow() {
                this.transition("x")
              }
            }],

            ["B", {
              type: "prototype",
              follow_arrow() {
                this.transition("y")
              }
            }],

          ]
        }, { x: "A", y: "B" }]

      ]
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

})
