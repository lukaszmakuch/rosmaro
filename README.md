![Rosmaro logo](https://rosmaro.js.org/doc/img/logo.png)

# Rosmaro

Reacting to the same action in different ways due to what happened in the past may be a challenge.

Rosmaro is a framework for writing functions like this:
```javascript
({state, action}) => ({state, result})
```

Check out [the Rosmaro documentation at rosmaro.js.org](http://rosmaro.js.org/doc/)!

Get Rosmaro using npm: `npm i rosmaro`.

Rosmaro places great emphasis on two programming paradigms:
* **Visual programming** - changes of behavior are drawn using the [Rosmaro visual editor](https://rosmaro.js.org/editor/).
* **Functional programming** - the whole model is a pure function built out of pure functions and pure data.

First, you draw a graph. Then, you assign functional code to its nodes.

![Rosmaro dispatch](https://rosmaro.js.org/doc/img/dispatch-illustration.jpeg)
It gives you:
* **Automata-based  dispatch** - actions are dispatched to handlers based on the current node of the state machine. There's no need to check the current state.
* **The right model for the job** - the behavior-related state is expressed by a state machine, while the data-related state lives in a dictionary.
* **Existing tooling** - it's easy to use with [redux](https://redux.js.org) and [redux-saga](https://redux-saga.js.org).

Rosmaro models support:
* **Node multiplication** - a node may be multiplied using a function of the context.
* **Reuse and composition** - models may be included within other models.
* **Lenses** - thanks to [Ramda lenses](https://ramdajs.com/docs/#lens) the shape and size of your data-related state may be easily adjusted.
* **Orthogonal regions** - multiple regions may be active at the same time. One of the ways to avoid state explosion.
* **Subgraphs** - nodes of state machines may contain other state machines.

## An example

1. Use the [Rosmaro visual editor](https://rosmaro.js.org/editor/) to draw a state machine. 
![The graph of The Cursed Prince](https://rosmaro.js.org/doc/img/example-graph.png)

2. Write some functional code.

This example makes use of the [rosmaro-binding-utils](https://github.com/lukaszmakuch/rosmaro-binding-utils) package.

```javascript
const Frog = handler({
  INTRODUCE_YOURSELF: () => "Ribbit! Ribbit!",
});

const Prince = handler({
  INTRODUCE_YOURSELF: () => "I am The Prince of Rosmaro!",
  EAT: ({action}) => action.dish === 'pizza' ? {arrow: 'ate a pizza'} : undefined
});
```

3. Enjoy your `({state, action}) => ({state, result})` function!

```
[
  {type: 'INTRODUCE_YOURSELF'},
  {type: 'EAT', dish: 'yakisoba'},
  {type: 'INTRODUCE_YOURSELF'},
  {type: 'EAT', dish: 'pizza'},
  {type: 'INTRODUCE_YOURSELF'}
].forEach(action => console.log(
  ({state} = model({state, action})).result.data
));
```

[The complete code of this example](https://github.com/lukaszmakuch/cursed-prince/blob/with-rosmaro-binding-utils/index.js) can be found on GitHub.

# Utilities
* [rosmaro-binding-utils](https://github.com/lukaszmakuch/rosmaro-binding-utils) - makes writing simple Rosmaro handlers easier.


## License
Rosmaro is licensed under the MIT license.
