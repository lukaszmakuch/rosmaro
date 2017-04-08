const assert = require('assert')
const r = require('./get_in_memory_rosmaro')

describe("context", function () {

  it("is empty by default", async function () {
    const rosmaro = r({
      get_context() {
        return this.context;
      }
    });

    const expected_context = { "": {} };
    const got_context = await rosmaro.get_context();
    assert.deepEqual(got_context, expected_context);
  })

  it("may be set during a transition", async function () {

    const rosmaro = r({
      type: "graph",
      start: "A",
      arrows: {
        A: { x: "B" }
      },
      nodes: {
        A: {
          follow_x() {
            return this.follow("x", {a: 123, b: 456})
          }
        },
        B: {
          get_context() {
            return this.context;
          }
        }
      }
    });


    await rosmaro.follow_x();
    const context = await rosmaro.get_context();
    const expected_context = {a: 123, b: 456};

    assert.deepEqual(context["B"], expected_context);
  })

  it("only different parts are merged", async function() {
    const initial_context = { a: "a", b: "b" }
    const set_by_1st_composed_node = { a: "z", b: "b" }
    const set_by_2nd_composed_node = { a: "a", b: "x" }
    const expected_result = { a: "z", b: "x" }

    const model = r({
      type: "graph",
      start: "init",
      arrows: {
        init: { done: "change_context" },
        change_context: { changed: "context_reader" }
      },
      nodes: {

        init: {
          init() {
            this.follow("done", initial_context)
          }
        },

        change_context: {
          type: "composite",
          nodes: [

            ["A", {
              change_context() {
                this.follow("changed", set_by_1st_composed_node)
              }
            }],

            ["B", {
              change_context() {
                this.follow("changed", set_by_2nd_composed_node)
              }
            }]

          ]
        },

        context_reader: {
          read_context() {
            return this.context
          }
        }

      }
    })

    model.init()
    model.change_context()
    const actual_context = await model.read_context()

    assert.deepEqual(actual_context['context_reader'], expected_result)

  })

  it("context of composite states is merged in case of simultaneous transitions", async function () {

    const context_returning_node = {
      get_context() {
        return this.context;
      }
    }

    const rosmaro = r({
      type: "composite",
      nodes: [
        ["A", {
          type: "graph",
          start: "A",
          arrows: {
            A: { b: "B" }
          },
          nodes: {
            A: {
              follow_b() {
                // the only difference compared to the B:A node is the param name
                return this.follow('b', {first_param: 123})
              }
            },
            B: context_returning_node
          }
        }],
        ["B", {
          type: "graph",
          start: "A",
          arrows: {
            A: { b: "B" }
          },
          nodes: {
            A: {
              follow_b() {
                return this.follow('b', {second_param: 456})
              }
            },
            B: context_returning_node
          }
        }],
      ]
    });

    await rosmaro.follow_b();
    const got_context = await rosmaro.get_context();
    assert.deepEqual(got_context, {
      "A:B": { first_param: 123, second_param: 456 },
      "B:B": { first_param: 123, second_param: 456 }
    });

  });

})
