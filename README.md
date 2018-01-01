
![Rosmaro logo](https://rosmaro.js.org/doc/img/logo.png)

# Rosmaro

Visual automata-based programming

***

It allows to build stateful objects - _Rosmaro models_. They keep data-related state in a dictionary structure and express behavior-related state using a state machine.

If you wish, you can think of Rosmaro using one of the following metaphors:

- An event-based routing for methods
- An object where _this_ is a state machine 
- A flavor of state diagrams brought to life

## What makes Rosmaro interesting

There are at least few reasons why Rosmaro may be interesting:

- Reduced number of error-prone conditional statements achieved by replacing many boolean flags with a graph.
- Programing using a human-friendly, declarative visual language that says _what_ should happen and not _how_ should it happen. 
- Code decoupling - any particular handler has a constant behavior that never changes and is not directly connected to any other handler.

## Example

Building a _Rosmaro model_ consists of two steps: 

1. Drawing a state machine graph that describes changes of behavior
1. Coding handlers - pieces of behavior associated with graph nodes

Let's build a model of a cursed prince, who turns into a frog after eating a pizza.

Although we could write a JSON file describing the graph by hand, it's a lot more fun to use the [Rosmaro Editor](https://rosmaro.js.org/editor).

![model graph](https://rosmaro.js.org/doc/img/example-graph.png)

After drawing the graph visible above, __the following JSON is generated automatically__.
```json
{
  "main": {
    "type": "graph",
    "nodes": {
      "Prince": "Prince",
      "Frog": "Frog"
    },
    "arrows": {
      "Prince": {
        "ate pizza": {
          "target": "Frog",
          "entryPoint": "start"
        }
      }
    },
    "entryPoints": {
      "start": {
        "target": "Prince",
        "entryPoint": "start"
      }
    }
  },
  "Prince": {
    "type": "leaf"
  },
  "Frog": {
    "type": "leaf"
  }
}
```

The graph tells the story of how does the model change over time and what makes it change. At the beginning it behaves like a _Prince_. That's what the arrow from the _start_ entry point pointing at the _Prince_ node is telling us. Then, as soon as the _Prince_ eats a pizza, he follows the arrow called _ate pizza_. The model is not anymore in the _Prince_ state, but in the _Frog_ state.

Now it's the time to code different behaviors.

This is the behavior of the _Frog_:
```javascript
const Frog = {
  introduceYourself: () => "Ribbit! Ribbit!"
};
```

It answers to only one method call - _introduceYourself_. Every single time when it's asked to introduce itself, it makes the _Ribbit!_ sound.

This is the behavior of the _Prince_:
```javascript
const Prince = {
  introduceYourself: () => "I am The Prince of Rosmaro!",
  eat: ({dish}) => {
    if (dish === 'pizza') return {arrow: 'ate pizza'};
  }
};
```

Every time he introduce himself, he says _I am The Prince of Rosmaro!_. When he eats a pizza, he follows the _ate pizza_ arrow.

Let's put it all together.
```javascript
import makeStorage from 'rosmaro-in-memory-storage';
import makeLock from 'rosmaro-process-wide-lock';
import rosmaro from 'rosmaro';
import graph from './graph.json'; // The generated graph

const Frog = {
  introduceYourself: () => "Ribbit! Ribbit!"
};

const Prince = {
  introduceYourself: () => "I am The Prince of Rosmaro!",
  eat: ({dish}) => {
    if (dish === 'pizza') return {arrow: 'ate pizza'};
  }
};

const model = rosmaro({
  graph,
  handlers: {Prince, Frog},
  storage: makeStorage(),
  lock: makeLock()
});
```

In order to obtain a working model, we need to provide at least 4 parts:

- the state machine graph (generated based on the drawn graph)
- handlers (code representing different behaviors)
- a storage (for example, from the [rosmaro-in-memory-storage](https://github.com/lukaszmakuch/rosmaro-in-memory-storage) package)
- a lock (for example, from the [rosmaro-process-wide-lock](https://github.com/lukaszmakuch/rosmaro-process-wide-lock) package)

The model works like expected:
```javascript
> model.introduceYourself();
'I am The Prince of Rosmaro!'

> model.eat({dish: 'yakisoba'});
undefined

> model.introduceYourself();
'I am The Prince of Rosmaro!'

> model.eat({dish: 'pizza'});
undefined

> model.introduceYourself();
'Ribbit! Ribbit!'
```

# Documentation

For more information, including installation instructions, please visit the documentation at [https://rosmaro.js.org/doc](https://rosmaro.js.org/doc).