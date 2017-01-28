const assert = require('assert');
const build_storage = require('./../src/in_memory_storage');
const build_rosmaro = require('./../src/rosmaro');

//builds an in memory rosmaro
const r = desc => build_rosmaro("id", desc, build_storage());

describe("context", function () {

  it("is empty by default", async function () {
    const rosmaro = r({
      type: "prototype",
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
      type: "machine",
      entry_point: "A",
      states: [
        ["A", {
          type: "prototype",
          follow_x() {
            return this.transition("x", {a: 123, b: 456})
          }
        }, {"x": "B"}],
        ["B", {
          type: "prototype",
          get_context() {
            return this.context;
          }
        }, {}]
      ]
    });


    await rosmaro.follow_x();
    const context = await rosmaro.get_context();
    const expected_context = {a: 123, b: 456};

    assert.deepEqual(context["B"], expected_context);
  })

  it("context of composite states is merged in case of simultaneous transitions", async function () {

    const context_returning_node = {
      type: "prototype",
      get_context() {
        return this.context;
      }
    }

    const rosmaro = r({
      type: "composite",
      states: [
        ["A", {
          type: "machine",
          entry_point: "A",
          states: [
            ["A", {
              type: "prototype",
              follow_b() {
                // the only difference compared to the B:A node is the param name
                return this.transition('b', {first_param: 123})
              }
            }, {"b": "B"}],
            ["B", context_returning_node, {}]
          ]
        }],
        ["B", {
          type: "machine",
          entry_point: "A",
          states: [
            ["A", {
              type: "prototype",
              follow_b() {
                return this.transition('b', {second_param: 456})
              }
            }, {"b": "B"}],
            ["B", context_returning_node, {}]
          ]
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
