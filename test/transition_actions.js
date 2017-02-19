const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("transition action", function () {

  it("works", async function () {

    var log = [];

    var actions_locks = {};

    const unlock_action = action_name => {
      actions_locks[action_name]()
    }

    const get_action = action_name => {
      const lock = new Promise((resolve, reject) => {
        actions_locks[action_name] = resolve
      })

      return async () => {
        await lock
        log.push(action_name)
      }
    }

    const before1 = get_action("before1")
    const before2 = get_action("before2")
    const before3 = get_action("before3")
    const after1 = () => log.push("after1")
    const after2 = get_action("after2")
    const left_A = get_action("left A")
    const after3 = get_action("after3")
    const left_B = get_action("left B")

    //should recurrency
    const model = r({
      type: "machine",
      entry_point: "A",
      states: [

        ["A", {
          type: "prototype",
          before_leave() {
            log.push("leaving A")
          },
          after_leave: left_A,
          follow_arrow() {
            this.transition("arrow")
          }
        }, {
          "arrow": [before1, before2, "B", after1, after2]
        }],

        ["B", {
          type: "prototype",
          on_entry() {
            log.push("entering B")
            this.transition("arrow")
          },
          before_leave() {
            log.push("leaving B")
          },
          after_leave: left_B
        }, {
          "arrow": [before3, "C", after3]
        }],

        ["C", {
          type: "prototype",
          on_entry() {
            log.push("entering C")
          }
        }, {}]

      ]
    })

    assert.deepEqual([], log)

    const transition = model.follow_arrow()
    unlock_action("left A")
    unlock_action("left B")
    unlock_action("after3")
    unlock_action("before2")
    unlock_action("before1")
    unlock_action("after2")
    unlock_action("before3")
    await transition;

    /*
    transition before
    node before leaving actions
    node on entering
    transition after
    node after leaving actions

    transitions from actions caused by entering the node
    */
    assert.deepEqual([

      "before1",
      "before2",
      "leaving A",
      "entering B",
      "after1",
      "after2",
      "left A",

      "before3",
      "leaving B",
      "entering C",
      "after3",
      "left B"

    ], log)

  })

})
