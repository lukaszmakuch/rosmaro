const assert = require('assert')
const build_storage = require('./../src/in_memory_storage')
const build_rosmaro = require('./../src/rosmaro')
const lock = require('./lock_test_double')().lock

describe("locking", function () {
  it ("allows to assume the order in which methods are executed", async function () {

    const storage = build_storage()

    const make_action_lock = () => {
      let unlock;
      const promise = new Promise((resolve, reject) => {
        unlock = resolve
      })
      return {unlock, promise}
    }

    let unlock_action = [
      make_action_lock(),
      make_action_lock(),
      make_action_lock(),
    ];

    let returned_action_lock = 0
    const get_action_lock = () => {
      const lock = unlock_action[returned_action_lock].promise;
      returned_action_lock++
      return lock
    }

    const desc = {
      type: "machine",
      entry_point: "A",
      states: [
        ["A", {
          type: "prototype",
          read() {
            return this.context.number
          },
          async incr() {
            const current = this.context.number ? this.context.number : 0;
            await get_action_lock()
            this.transition("loop", {number: current + 1})
          }
        }, {loop: "A"}]
      ]
    }

    const r = () => build_rosmaro("test rosmaro", desc, storage, lock)

    r().incr()
    r().incr()
    r().incr()

    unlock_action[2].unlock()
    unlock_action[0].unlock()
    unlock_action[1].unlock()

    const got_number = await r().read()
    assert.equal(got_number["A"], 3)
  })
})
