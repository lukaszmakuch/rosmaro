# Graph builder

Takes:
1. a JSON file (generated using the Rosmaro Editor) describing the graph
2. a JS object describing the desired behavior (from the end user point of view)
3. the context object
4. a handler factory function (from the handlers module)

Gives:
1. a ready to use (by the dispatcher and FSM modules) graph structure 
(static, built based on the context)
2. ready to use (by the dispatcher module) handler functions 

IMPORTANT: Due to dynamic composites, the built graph may differ depending on the context. That's why it shouldn't be cached.

## Related test files
- test/graphBuilder.js