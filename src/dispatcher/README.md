# Dispatcher

Calls functions based on the current state of the state machine.

```javascript
import dispatch from './api';

const {arrows, context, result} = dispatch({
  graph,
  FSMState,
  handlers,
  context,
  action: {type},
  lenses
});
```