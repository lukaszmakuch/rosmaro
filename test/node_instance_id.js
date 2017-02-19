const assert = require('assert')
const build_storage = require('./../src/in_memory_storage')
const build_rosmaro = require('./../src/rosmaro')

describe.skip("node instance id", function () {

  it("identifies every single node", async function () {

    const desc = {
      type: "machine",
      entry_point: "A",
      nodes: [

        ["A", {
          type: "prototype",
          get_id() {
            return this.id
          },
          next() {
            this.transition("next")
          }
        }, {"next": "B"}],

        ["B", {
          type: "prototype",
          get_id() {
            return this.id
          },
          loop() {
            this.transition("self")
          }
        }, {"self": "B"}]

      ]
    }

    const storage = build_storage()
    const r = () => build_rosmaro("test rosmaro", desc, storage)

    let A_id1 = await r().get_id()
    A_id1 = A_id1["A"]

    await r().next()

    let B_id1 = await r().get_id()
    B_id1 = B_id1["B"]

    await r().loop()

    let B_id2 = await r().get_id()
    B_id2 = B_id2["B"]

    let B_id2_read_again = await r().get_id()
    B_id2_read_again = B_id2_read_again["B"]

    assert.notEqual(A_id1, B_id1)
    assert.notEqual(B_id1, B_id2)
    asser.equal(B_id2, B_id2_read_again)

  })

})
