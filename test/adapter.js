const assert = require('assert');
const build_storage = require('./../src/in_memory_storage');
const build_rosmaro = require('./../src/rosmaro');

//builds an in memory rosmaro
const r = desc => build_rosmaro("id", desc, build_storage());

describe("adapter", function () {

  it("maps context and transitions", async function () {

    const incompatible = {
      type: "machine",
      entry_point: "A",
      states: [

        ["A", {
          type: "prototype",
          action() {
            this.transition("a", { number: this.context.number * 2 })
          }
        }, {"a": "B"}],

        ["B", {
          type: "prototype",
          action() {
            this.transition("a")
          }
        }]
      ]
    }

    const b = {
      type: "prototype",
      follow_b() {
        this.transition("b", { value: 100 })
      },
      get_value() {
        return this.context.value;
      }
    }

    const adapted_incompatible = {
      type: "adapter",
      adapted: incompatible,
      map_input_context(context) {
        return { number: context.value }
      },
      map_output_context(context) {
        return { value: context.number }
      },
      rename_leaving_transitions: {
        "a": "b"
      }
    }

    const main = {
      type: "machine",
      entry_point: "B",
      states: [
        ["adapted_incompatible", adapted_incompatible, {
          "b": "B"
        }],
        ["B", b, {
          "b": "adapted_incompatible"
        }]
      ]
    }

    const rosmaro = r(main);

    await rosmaro.follow_b();
    await rosmaro.action();
    const adapted_incompatible_nodes = await rosmaro.nodes;
    await rosmaro.action();
    const result = await rosmaro.get_value();
    assert.deepEqual({"B": 200}, result);
    assert.deepEqual(["adapted_incompatible:B"], adapted_incompatible_nodes);

  })

});
