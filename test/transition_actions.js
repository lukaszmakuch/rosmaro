const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("transition action", function () {

  it("works", async function () {

    var log = [];

    var transition_actions_locks = {};

    const unlock_action = action_name => {
      transition_actions_locks[action_name]()
    }

    const get_transition_action = action_name => {
      const lock = new Promise((resolve, reject) => {
        transition_actions_locks[action_name] = resolve
      })

      return async () => {
        await lock
        log.push(action_name)
      }
    }

    const before1 = get_transition_action("before1")
    const before2 = get_transition_action("before2")
    const before3 = get_transition_action("before3")
    const after1 = () => log.push("after1")
    const after2 = get_transition_action("after2")
    const after3 = get_transition_action("after3")

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
          }
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
    unlock_action("after3")
    unlock_action("before2")
    unlock_action("before1")
    unlock_action("after2")
    unlock_action("before3")
    await transition;

    /*
    transition before
    node on leaving
    node on entering
    transition after

    transitions from actions caused by entering the node
    */
    assert.deepEqual([

      "before1",
      "before2",
      "leaving A",
      "entering B",
      "after1",
      "after2",

      "before3",
      "leaving B",
      "entering C",
      "after3"

    ], log)

  })

})
