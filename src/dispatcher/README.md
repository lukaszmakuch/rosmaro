# Dispatcher

Actually calls method handlers. It may cause side effects and be asynchronous. 
The returned arrows are consumed by the FSM module in order to obtain the next FSM state.

```
dispatch({
  graph, 
  node = 'main',
  FSMState, 
  handlers, 
  ctx, 
  method,
  instanceID,
  params,
  model
}) => ({
    arrows: [
      [['main:B:B:A', 'x'], ['main:B:B', 'x'], ['main:B', 'x']],
      [['main:B:B:B', 'y'], ['main:B:B', 'y'], ['main:B', 'y']]
    ],
    ctx: {a: 100, b: 200},
    res: 'ARes_BRes'
  })
```

## Related test files
- test/dispatcher.js
- test/pathExtractor.js