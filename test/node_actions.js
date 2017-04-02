const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("node action", function () {

  describe("actions after leave", function () {
    it("is triggered after the node is left", async function () {

      let log = [];

      const model = r({
        type: "machine",
        entry_point: "A",
        states: [

          ["A", {
            type: "prototype",
            follow_arrow() {
              this.transition("arrow")
            },
            before_leave() {
              log.push('leaving A')
            },
            after_leave() {
              log.push('left A')
            }
          }, {"arrow": "B"}],

          ["B", {
            type: "prototype",
            on_entry() {
              log.push("entering B");
            }
          }, {}]

        ]
      })

      await model.follow_arrow()
      assert.deepEqual([
        "leaving A",
        "entering B",
        "left A"
      ], log)

    })
  })

  describe("action before leave", function () {

    it("is triggered before the node is left", async function () {

      let context_before_leaving;

      const model = r({
        type: "machine",
        entry_point: "A",
        states: [

          ["A", {
            type: "prototype",
            leave() {
              this.transition("arrow", {for_arrow: "abc"})
            },
            before_leave() {
              context_before_leaving = this.context
            }
          }, {
            "arrow": "B"
          }],

          ["B", {
            type: "prototype"
          }, {}]

        ]
      })

      assert(!context_before_leaving)
      await model.leave()
      assert.deepEqual({}, context_before_leaving)

    })

    it("doesn't allow transitions", async function () {

      const model = r({
        type: "machine",
        entry_point: "A",
        states: [

          ["A", {
            type: "prototype",
            leave() {
              this.transition('x')
            },
            before_leave() {
              this.transition('y')
            }
          }, {x: "B", y: "C"}],

          ["B", {
            type: "prototype"
          }, {y: 'C'}],

          ["C", {
            type: "prototype"
          }, {}]

        ]
      })

      await model.leave()
      const nodes = await model.nodes
      assert.deepEqual(['B'], nodes)

    })

  })

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
