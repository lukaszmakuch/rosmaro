const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("node action", function () {

  describe("action on entry", function () {

    it("doesn't apply to the initial state", async function () {

      let executed = false

      const model = r({
        type: "prototype",
        on_entry() {
          executed = true
        }
      })

      assert(!executed)

    })

    it("is executed right after the node is entered", async function () {

      let executed = false

      const A = {
        type: "prototype",
        follow_arrow() {
          this.transition("arrow")
        }
      }

      const B = {
        type: "prototype",
        on_entry() {
          executed = true
        }
      }

      const root = {
        type: "machine",
        entry_point: "A",
        states: [
          ["A", A, {"arrow": "B"}],
          ["B", B, {}]
        ]
      }

      const model = r(root)

      assert(!executed)
      await model.follow_arrow()
      assert(executed)

    })

    it("is executed by loops", async function () {

      let executed = false

      const model = r({
        type: "machine",
        entry_point: "A",
        states: [
          ["A", {
            type: "prototype",
            on_entry() {
              executed = true
            },
            follow_arrow() {
              this.transition("arrow")
            }
          }, {"arrow": "A"}],
        ]
      })

      assert(!executed)
      await model.follow_arrow()
      assert(executed)

    })

    it("is executed when re-entering a submachine", async function () {

      let executed = false;

      const A = {
        type: "machine",
        entry_point: "A",
        states: [
          ["A", {
            type: "prototype",
            on_entry() {
              executed = true
            },
            leave() {
              this.transition("arrow")
            }
          }, {"arrow": "A"}]
        ]
      }

      const B = {
        type: "prototype",
        on_entry() {
          this.transition("arrow")
        }
      }

      const root = {
        type: "machine",
        entry_point: "A",
        states: [
          ["A", A, {"arrow": "B"}],
          ["B", B, {"arrow": "A"}],
        ]
      }

      const model = r(root)

      assert(!executed)
      await model.leave()
      assert(executed)

    })

    it("may cause a transition", async function () {

      const A = {
        type: "prototype",
        follow_arrow() {
          this.transition("arrow")
        },
        get_received() {
          return this.context.given
        }
      }

      const B = {
        type: "prototype",
        on_entry() {
          this.transition("arrow", {given: 123})
        }
      }

      const root = {
        type: "machine",
        entry_point: "A",
        states: [
          ["A", A, {"arrow": "B"}],
          ["B", B, {"arrow": "A"}]
        ]
      }

      const model = r(root)

      await model.follow_arrow()
      const received = await model.get_received()
      assert.equal("123", received["A"])

    })

  })

})
