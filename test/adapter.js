const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("adapter", function () {

  it("may be nested", async function () {

    const desc = {
      type: "graph",
      start: "A",
      arrows: {
        B: { arrow_d: "A" },
        A: { arrow: "B" }
      },
      nodes: {
        A: {
          get_ctx() {
            return this.context
          },
          follow_arrow() {
            this.follow("arrow", {field_d: "from_A"})
          }
        },
        B: {
          type: "adapter",
          map_entering_context(ctx) {
            return { field_c: ctx.field_d }
          },
          map_leaving_context(ctx) {
            return { field_d: ctx.field_c }
          },
          rename_leaving_arrows: {
            "arrow_c": "arrow_d"
          },
          adapted: {
            type: "adapter",
            map_entering_context(ctx) {
              return { field_b: ctx.field_c }
            },
            map_leaving_context(ctx) {
              return { field_c: ctx.field_b }
            },
            rename_leaving_transitions: {
              "arrow_b": "arrow_c"
            },
            adapted: {
              type: "adapter",
              map_entering_context(ctx) {
                return { field_a: ctx.field_b }
              },
              map_leaving_context(ctx) {
                return { field_b: ctx.field_a }
              },
              rename_leaving_transitions: {
                "arrow_a": "arrow_b"
              },
              adapted: {
                follow_arrow() {
                  this.follow("arrow_a", {field_a : "from_B"})
                },
                get_ctx() {
                  return this.context
                }
              }
            }
          }
        }
      }
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
      type: "graph",
      start: "A",
      arrows: {
        A: { a: "B" }
      },
      nodes: {
        A: {
          action() {
            this.follow("a", { number: this.context.number * 2 })
          }
        },
        B: {
          action() {
            this.follow("a")
          }
        }
      }
    }

    const b = {
      follow_b() {
        this.follow("b", { value: 100 })
      },
      get_value() {
        return this.context.value;
      }
    }

    const adapted_incompatible = {
      type: "adapter",
      adapted: incompatible,
      map_entering_context(context) {
        return { number: context.value }
      },
      map_leaving_context(context) {
        return { value: context.number }
      },
      rename_leaving_arrows: {
        "a": "b"
      }
    }

    const main = {
      type: "graph",
      start: "B",
      arrows: {
        adapted_incompatible: { b: "B" },
        B: { b: "adapted_incompatible" }
      },
      nodes: { B: b, adapted_incompatible }
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
