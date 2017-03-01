const assert = require('assert')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock = require('./lock_test_double')().lock

describe("storage error", function () {

  let model
  let storage

  beforeEach(function () {
    storage = build_storage()
    model = build_rosmaro(
      "id",
      {
        type: "machine",
        entry_point: "A",
        states: [
          ["A", {
            type: "prototype",
            loop() {
              this.transition("self")
            }
          }, {self: "A"}]
        ]
      },
      storage,
      lock
    )
  })

  it("may cause an error when reading from it", async function () {
    storage.make_reading_fail_with("read error")
    let thrown
    try { await model.loop() } catch (err) { thrown = err }
    assert.deepEqual({ type: "unable_to_read_data", previous: "read error" }, thrown)
  })

  it("may cause an error when writing to it", async function () {
    storage.make_writing_fail_with("write error")
    let thrown
    try { await model.loop() } catch (err) { thrown = err }
    assert.deepEqual({ type: "unable_to_write_data", previous: "write error" }, thrown)
  })

})
