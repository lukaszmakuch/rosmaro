const assert = require('assert');
const build_storage = require('./../src/in_memory_storage');
const build_rosmaro = require('./../src/rosmaro');

//builds an in memory rosmaro
const r = desc => build_rosmaro("id", desc, build_storage());

describe("adapter", function () {

  it("may be nested", async function () {

    const desc = {
      type: "machine",
      entry_point: "A",
      states: [
        ["B", {
          type: "adapter",
          map_input_context(ctx) {
            return { field_c: ctx.field_d }
          },
          map_output_context(ctx) {
            return { field_d: ctx.field_c }
          },
          rename_leaving_transitions: {
            "arrow_c": "arrow_d"
          },
          adapted: {
            type: "adapter",
            map_input_context(ctx) {
              return { field_b: ctx.field_c }
            },
            map_output_context(ctx) {
              return { field_c: ctx.field_b }
            },
            rename_leaving_transitions: {
              "arrow_b": "arrow_c"
            },
            adapted: {
              type: "adapter",
              map_input_context(ctx) {
                return { field_a: ctx.field_b }
              },
              map_output_context(ctx) {
                return { field_b: ctx.field_a }
              },
              rename_leaving_transitions: {
                "arrow_a": "arrow_b"
              },
              adapted: {
                type: "prototype",
                follow_arrow() {
                  this.transition("arrow_a", {field_a : "from_B"})
                },
                get_ctx() {
                  return this.context
                }
              }
            }
          }
        }, {
          "arrow_d": "A"
        }],
        ["A", {
          type: "prototype",
          get_ctx() {
            return thix.context
          },
          follow_arrow() {
            this.transition("arrow", {field_d: "from_A"})
          }
        }, {
          "arrow": "B"
        }]
      ]
    }

    const rosmaro = r(desc)
    await rosmaro.follow_arrow()
    const B_context = await rosmaro.get_ctx()
    await rosmaro.follow_arrow();
    const A_context = await rosmaro.get_ctx();

    assert.deepEqual(B_context, {"B": {field_a: "from_A"}});
    //assert.deepEqual(A_context, {"A": {field_d: "from_B"}});
  })

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
