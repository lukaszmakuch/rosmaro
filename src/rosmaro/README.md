# Rosmaro

Exposes the Rosmaro factory.

The built model:
- uses the graph builder and handlers factory to turn user-friendly declaration of the model into code which is convenient to work with when it comes to handling the behavior
- uses the provided lock mechanism to acquire a lock
- uses the provided storage to read the model data
- uses the dispatcher module to call methods
- uses the FSM module to obtain the new FSM state
- stores the new model data in the storage
- releases the lock

## Related test files
- test/rosmaro.js