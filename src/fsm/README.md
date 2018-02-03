# Finite state machine

Exposes pure functions which handle FSM transitions and provide the initial state.

```
default: {graph, FSMState, arrows} => {FSMState, leftNodes, enteredNodes}
initState: graph => {parent: 'active child', anotherParent: 'active child', ... }
```

graphDiff.js is an important file which contains a function comparing two different FSMStates and returns entered and left nodes.

# Related test files
- test/fsm.js
- test/graphDiff.js