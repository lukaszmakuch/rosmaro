const r = require('./get_in_memory_rosmaro')
const assert = require('assert')

describe("graph", function () {

  it("remembers the left node even if it is the initial node", async function () {

    const A = {
      type: "graph",
      start: "A",
      arrows: {
        A: { x: "B" },
        B: { x: "A" }
      },
      nodes: {
        A: {
          follow_x() { this.follow("x") },
          follow_y() { this.follow("y") }
        },
        B: {
          follow_x() { this.follow("x") }
        }
      }
    }

    const B = {
      follow_x() { this.follow("x") }
     }

   const root = {
     type: "graph",
     start: "A",
     arrows: {
       A: { y: "B" },
       B: { x: "A" }
     },
     nodes: { A, B }
   }

   const model = r(root)

   await model.follow_x()
   await model.follow_x()
   await model.follow_y()
   await model.follow_x()
   const nodes = await model.nodes

   assert.deepEqual(["A:A"], nodes)
  })

})
