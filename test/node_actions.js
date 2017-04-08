const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("node action", function () {

  describe("actions after leave", function () {
    it("is triggered after the node is left", async function () {

      let log = [];

      const model = r({
        type: "graph",
        start: "A",
        arrows: {
          A: { arrow: "B" }
        },
        nodes: {
          A: {
            follow_arrow() {
              this.follow("arrow")
            },
            before_leave() {
              log.push('leaving A')
            },
            after_leave() {
              log.push('left A')
            }
          },
          B: {
            on_entry() {
              log.push("entering B");
            }
          }
        }
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
        type: "graph",
        start: "A",
        arrows: {
          A: { arrow: "B" }
        },
        nodes: {
          A: {
            leave() {
              this.follow("arrow", {for_arrow: "abc"})
            },
            before_leave() {
              context_before_leaving = this.context
            }
          },
          B: {}
        }
      })

      assert(!context_before_leaving)
      await model.leave()
      assert.deepEqual({}, context_before_leaving)

    })

    it("doesn't allow transitions", async function () {

      const model = r({
        type: "graph",
        start: "A",
        arrows: {
          A: { x: "B", y: "C" },
          B: { y: "C" },
          C: {}
        },
        nodes: {
          A: {
            leave() {
              this.follow('x')
            },
            before_leave() {
              this.follow('y')
            }
          },
          B: {},
          C: {}
        }
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
        on_entry() {
          executed = true
        }
      })

      assert(!executed)

    })

    it("is executed right after the node is entered", async function () {

      let executed = false

      const A = {
        follow_arrow() {
          this.follow("arrow")
        }
      }

      const B = {
        on_entry() {
          executed = true
        }
      }

      const root = {
        type: "graph",
        start: "A",
        arrows: {
          A: { "arrow": "B" }
        },
        nodes: { A, B }
      }

      const model = r(root)

      assert(!executed)
      await model.follow_arrow()
      assert(executed)

    })

    it("is executed by loops", async function () {

      let executed = false

      const model = r({
        type: "graph",
        start: "A",
        arrows: {
          A: { arrow: "A" }
        },
        nodes: {
          A: {
            on_entry() {
              executed = true
            },
            follow_arrow() {
              this.follow("arrow")
            }
          }
        }
      })

      assert(!executed)
      await model.follow_arrow()
      assert(executed)

    })

    it("is executed when re-entering a submachine", async function () {

      let executed = false;

      const A = {
        type: "graph",
        start: "A",
        arrows: {
          A: { arrow: "A" }
        },
        nodes: {
          A: {
            on_entry() {
              executed = true
            },
            leave() {
              this.follow("arrow")
            }
          }
        }
      }

      const B = {
        on_entry() {
          this.follow("arrow")
        }
      }

      const root = {
        type: "graph",
        start: "A",
        arrows: {
          A: { arrow: "B" },
          B: { arrow: "A" }
        },
        nodes: { A, B }
      }


      const model = r(root)
      assert(!executed)
      await model.leave()
      assert(executed)

    })

    it("may cause a transition", async function () {

      const A = {
        follow_arrow() {
          this.follow("arrow")
        },
        get_received() {
          return this.context.given
        }
      }

      const B = {
        on_entry() {
          this.follow("arrow", {given: 123})
        }
      }

      const root = {
        type: "graph",
        start: "A",
        arrows: {
          A: { arrow: "B" },
          B: { arrow: "A" }
        },
        nodes: { A, B }
      }

      const model = r(root)

      await model.follow_arrow()
      const received = await model.get_received()
      assert.equal("123", received["A"])

    })

  })

})
