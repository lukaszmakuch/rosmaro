const assert = require('assert')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock_mock = require('./lock_test_double')

describe("node instance id", function () {

  it("identifies every single node", async function () {

    const desc = {
      type: "graph",
      start: "A",
      arrows: {
        A: { next: "B" },
        B: { self: "B" }
      },
      nodes: {
        A: {
          get_id() {
            return this.id
          },
          next() {
            this.follow("next")
          }
        },
        B: {
          get_id() {
            return this.id
          },
          loop() {
            this.follow("self")
          }
        }
      }
    }

    const storage = build_storage()
    const r = () => build_rosmaro(desc, storage, lock_mock().lock)

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
    assert.equal(B_id2, B_id2_read_again)

  })

  it("is different for every node of a composite node", async function () {

    const desc = {
      type: "composite",
      nodes: [

        ["A", {
          get_id() {
            return this.id
          }
        }],

        ["B", {
          get_id() {
            return this.id
          }
        }],

      ]
    }

    const storage = build_storage()
    const r = () => build_rosmaro(desc, storage, lock_mock().lock)

    const read_ids = await r().get_id()

    assert.notEqual(read_ids["A"], read_ids["B"])

    const ids_read_again = await r().get_id()

    assert.deepEqual(read_ids, ids_read_again)
  })

})
