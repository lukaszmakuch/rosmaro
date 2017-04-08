const assert = require('assert')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const lock_mock = require('./lock_test_double')

describe("error throwing method", function () {
  it("doesn't cause a deadlock", async function () {

    let call_count = 0

    const model = build_rosmaro(
      {
        type: "graph",
        start: "A",
        arrows: {
          A: { self: "A" }
        },
        nodes: {
          A: {
            fail() {
              call_count++
              throw `error${call_count}`
            }
          }
        }
      },
      build_storage(),
      lock_mock().lock
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