# Graph builder

Takes:
1. graph plan, 
2. context mapping functions,
3. functions which return lists of nodes when they are given the context,
4. method handlers,

Gives:
1. a ready to use (by the dispatcher and FSM modules) graph structure 
(static, built based on the context)
2. ready to use (by the dispatcher module) handler functions 
3. ready to use context mapping functions

IMPORTANT: Due to dynamic composites, the built graph may differ depending on the context. That's why it shouldn't be cached.

## Related test files
- test/graphBuilder.js