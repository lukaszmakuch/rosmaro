const assert = require('assert')
const build_storage = require('./storage_test_double')
const build_rosmaro = require('./../src/rosmaro')
const make_lock = require('./lock_test_double')
let locks
const assert_error = require('./errors').assert_error

const get_locks = locks_count => {
  const make_lock = () => {
    let unlock;
    const promise = new Promise((resolve, reject) => {
      unlock = resolve
    })
    return {unlock, promise}
  }

  let locks = [];
  for (let i = 0; i < locks_count; i++) {
    locks[i] = make_lock()
  }

  let i = 0
  const get_next_lock = () => {
    return locks[i].promise
  }

  const unlock = i => {
    locks[i].unlock()
  }

  return {unlock, get_next_lock}
}

describe("locking", function () {

  beforeEach(function () {
    locks = make_lock()
  })

  describe("unsynchronized call", function () {

    const get_model = (opts) => {

      const AA_proto = opts.AA_unsync ? {unsynchronized: ["incr"]} : {}
      const BA_proto = opts.BA_unsync ? {unsynchronized: ["incr"]} : {}
      const storage = build_storage()

      var {unlock, get_next_lock} = get_locks(4)

      const desc = {
        type: "composite",
        nodes: [

          ["A", {
            type: "graph",
            start: "A",
            arrows: {
              A: { self: "A" }
            },
            nodes: {
              A: Object.assign({
                read() {
                  return this.context.numberA
                },
                async incr() {
                  const curr = this.context.numberA ? this.context.numberA : 0
                  await get_next_lock()
                  this.follow("self", {numberA: curr + 1})
                }
              }, AA_proto)
            }
          }],

          ["B", {
            type: "graph",
            start: "A",
            arrows: {
              A: { self: "A" }
            },
            nodes: {
              A: Object.assign({
                read() {
                  return this.context.numberB
                },
                async incr() {
                  const curr = this.context.numberB ? this.context.numberB : 0
                  await get_next_lock()
                  this.follow("self", {numberB: curr + 1})
                }
              }, BA_proto)
            }
          }],

        ]
      }

      const model = build_rosmaro(desc, storage, locks.lock)
      return {model, unlock, storage}
    }

    it("allows to skip synchronization", async function () {
      const {unlock, model} = get_model({
        AA_unsync: true,
        BA_unsync: true
      })

      const first_call = model.incr()
      const second_call = model.incr()

      unlock(0)
      unlock(1)
      //second concurrent call
      unlock(2)
      unlock(3)

      await first_call
      await second_call

      const read_number = await model.read()
      assert.deepEqual({"A:A": 1, "B:A": 1}, read_number)
    })

    it("skips synchronization only if all composite methods are unsynchronized", async function () {
      const {unlock, model} = get_model({
        AA_unsync: true,
        BA_unsync: false
      })

      const first_call = model.incr()
      const second_call = model.incr()

      unlock(0)
      unlock(2)
      unlock(1)
      //second concurrent call
      unlock(3)

      await first_call
      await second_call

      const read_number = await model.read()
      assert.deepEqual({"A:A": 2, "B:A": 2}, read_number)
    })

  })

  it("allows to assume the order in which methods are executed", async function () {

    const storage = build_storage()

    var {unlock, get_next_lock} = get_locks(3)
    const desc = {
      type: "graph",
      start: "A",
      arrows: {
        A: { loop: "A" }
      },
      nodes: {
        A: {
          read() {
            return this.context.number
          },
          async incr() {
            const current = this.context.number ? this.context.number : 0;
            await get_next_lock()
            this.follow("loop", {number: current + 1})
          }
        }
      }
    }

    const r = () => build_rosmaro(desc, storage, locks.lock)
    r().incr()
    r().incr()
    r().incr()

    unlock(2)
    unlock(0)
    unlock(1)

    const got_number = await r().read()

    assert.equal(got_number["A"], 3)
  })

  it("always locks the stage of reading the state", async function () {

    let method_called = false

    const desc = {
      type: "graph",
      start: "A",
      arrows: {
        A: { slef: "A" }
      },
      nodes: {
        A: {
          unsynchronized: ["call_method"],
          call_method() {
            method_called = true
          }
        }
      }
    }

    const storage = build_storage()
    const model = build_rosmaro(desc, storage, locks.lock)

    storage.lock()

    const call = model.call_method()
      .then(() => method_called = true)

    assert.equal(method_called, false)

    storage.unlock()

    await call

    assert.equal(method_called, true)
  })

  describe("throwing exceptions", function () {

    let model;

    beforeEach(function () {
      const desc = {
        type: "graph",
        start: "A",
        arrows: {
          A: { self: "A" }
        },
        nodes: {
          A: {
            call() {}
          }
        }
      }

      model = build_rosmaro(desc, build_storage(), locks.lock)
    })

    it("may throw an exception when locking", async function () {
      const locking_error = new Error("locking failed")
      locks.make_locking_fail_with(locking_error)
      let thrown
      try { await model.call() } catch (e) { thrown = e }
      assert_error({ thrown, expected_parent: locking_error, type: "unable_to_lock" })
    })

    it("may throw an exception when unlocking", async function () {
      const unlocking_error = new Error("unlocking failed")
      locks.make_unlocking_fail_with(unlocking_error)
      let thrown
      try { await model.call() } catch (e) { thrown = e }
      assert_error({ thrown, expected_parent: unlocking_error, type: "unable_to_unlock" })
    })

  })

})
