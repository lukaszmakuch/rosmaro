const assert = require('assert')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock_mock = require('./lock_test_double')
const assert_error = require('./errors').assert_error

describe("storage error", function () {

  let model
  let storage

  beforeEach(function () {
    storage = build_storage()
    model = build_rosmaro(
      {
        type: "graph",
        start: "A",
        arrows: {
          A: { self: "A" }
        },
        nodes: {
          A: {
            loop() {
              this.follow("self")
            }
          }
        }
      },
      storage,
      lock_mock().lock
    )
  })

  it("may cause an error when reading from it", async function () {
    const read_error = new Error("read error")
    storage.make_reading_fail_with(read_error)
    let thrown
    try { await model.loop() } catch (err) { thrown = err }
    assert_error({thrown, expected_parent: read_error, type: "unable_to_read_data" })
  })

  it("may cause an error when writing to it", async function () {
    const write_error = new Error("write error")
    storage.make_writing_fail_with(write_error)
    let thrown
    try { await model.loop() } catch (err) { thrown = err }
    assert_error({thrown, expected_parent: write_error, type: "unable_to_write_data" })
  })

})
