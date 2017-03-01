const assert = require('assert')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock = require('./lock_test_double')().lock

describe("error throwing method", function () {
  it("doesn't cause a deadlock", async function () {

    let call_count = 0

    const model = build_rosmaro(
      "id",
      {
        type: "machine",
        entry_point: "A",
        states: [
          ["A", {
            type: "prototype",
            fail() {
              call_count++
              throw `error${call_count}`
            }
          }, {self: "A"}]
        ]
      },
      build_storage(),
      lock
    )

    let thrown = []

    try { await model.fail() } catch (err) { thrown.push(err) }
    try { await model.fail() } catch (err) { thrown.push(err) }
    try { await model.fail() } catch (err) { thrown.push(err) }

    assert.deepEqual(
      ["error1", "error2", "error3"],
      thrown
    )

    assert.equal(3, call_count)

  })
})
