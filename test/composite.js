const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("composite", function () {

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

})
