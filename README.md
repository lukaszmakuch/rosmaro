![Rosmaro logo](https://rosmaro.js.org/doc/img/logo.png)

# Rosmaro

Reacting to the same action in different ways due to what happened in the past may be a challenge.

Rosmaro is a framework for writing functions like this:
```javascript
({state, action}) => ({state, result})
```

![Rosmaro dispatch](https://rosmaro.js.org/doc/img/dispatch_illustration.gif)

Check out [the Rosmaro documentation at rosmaro.js.org](http://rosmaro.js.org/doc/)!

Get Rosmaro using npm: `npm i rosmaro`.

Rosmaro places great emphasis on two programming paradigms:
* **Visual programming** - changes of behavior are drawn using the [Rosmaro visual editor](https://rosmaro.js.org/editor/).
* **Functional programming** - the whole model is a pure function built out of pure functions and pure data.

First, you draw a graph. Then, you assign functional code to its nodes.

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

## News

- [🖥 A screencast about building a Ticket Vending Machine](https://www.youtube.com/watch?v=JpFn4Q81f14)

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

```javascript
[
  {type: 'INTRODUCE_YOURSELF'}, // 'I am The Prince of Rosmaro!'
  {type: 'EAT', dish: 'yakisoba'}, // undefined
  {type: 'INTRODUCE_YOURSELF'}, // 'I am The Prince of Rosmaro!'
  {type: 'EAT', dish: 'pizza'}, // undefined
  {type: 'INTRODUCE_YOURSELF'} // 'Ribbit! Ribbit!'
].forEach(action => console.log(
  ({state} = model({state, action})).result.data
));
```

[The complete code of this example](https://github.com/lukaszmakuch/cursed-prince/blob/with-rosmaro-binding-utils/index.js) can be found on GitHub.

## Documentation
- [An example](https://rosmaro.js.org/doc/#an-example)
- [Building a model](https://rosmaro.js.org/doc/#building-a-model)
- [About drawing Rosmaro graphs](https://rosmaro.js.org/doc/#graphs)
- [About writing Rosmaro code](https://rosmaro.js.org/doc/#bindings)

## Blog posts
- [A JavaScript framework for functions of state and action](https://lukaszmakuch.pl/post/a-javascript-framework-for-functions-of-state-and-action)
- [What did we lose when we moved to Redux?](https://lukaszmakuch.pl/post/what-did-we-lose-when-we-moded-to-redux/)
- [Dynamic orthogonal regions in state machines](https://lukaszmakuch.pl/post/dynamic-orthogonal-regions)
- [Decomposing the TodoMVC app with state diagrams](https://lukaszmakuch.pl/post/decomposing-the-todomvc-app-with-state-diagrams)
- [An overview of the Rosmaro-TodoMVC app codebase](https://lukaszmakuch.pl/post/an-overview-of-the-rosmaro-todomvc-app-codebase)
- [Testing the TodoMVC app](https://lukaszmakuch.pl/post/testing-the-todomvc-app)
- [State management in JavaScript: data-related state and behavior-related state](https://lukaszmakuch.pl/post/behavior-related-state-and-data-related-state)


## Examples
- [Bunny App](https://github.com/lukaszmakuch/Rosmaro-React-example-Bunny-App) a wizard implemented in Rosmaro, React, Redux and Redux-Saga.
- [TodoMVC](https://github.com/lukaszmakuch/todomvc-rosmaro) the famous TodoMVC demo app
- [bool-less-todo](https://github.com/lukaszmakuch/bool-less-todo) a todo app implemented without boolean values and without variables

## Utilities
- [rosmaro-snabbdom-starter](https://github.com/lukaszmakuch/rosmaro-snabbdom-starter) - a zero configuration Rosmaro Snabbdom starter.
- [rosmaro-redux](https://github.com/lukaszmakuch/rosmaro-redux) - connects Rosmaro, **[Redux](https://redux.js.org) and [Redux-Saga](https://redux-saga.js.org)**.
- [rosmaro-react](https://github.com/lukaszmakuch/rosmaro-react) - connects Rosmaro and **[React](https://reactjs.org)**.
- [rosmaro-binding-utils](https://github.com/lukaszmakuch/rosmaro-binding-utils) - makes writing simple Rosmaro handlers easier.
- [rosmaro-tools](https://github.com/lukaszmakuch/rosmaro-tools) - CLI tooling for Rosmaro.
- [rosmaro-testing-library](https://github.com/lukaszmakuch/rosmaro-testing-library) - testing utilities for Rosmaro.

## License
Rosmaro is licensed under the MIT license.