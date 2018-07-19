# Finite state machine

Exposes pure functions which handle FSM transitions and provide the initial state.

```
default: {graph, FSMState, arrows} => newFSMState
initState: graph => {parent: 'active child', anotherParent: 'active child', ... }
```