# Rosmaro
Changes of behavior modeled as a graph.

## Brief description
Rosmaro is a library that allows to model changes of behavior as a graph.

Every node represents some behavior and can follow an arrow to a different node, and thus change the behavior of the model.

A graph is made of nodes.

Nodes may be:
- simple bags of functions
- other graphs
- few other nodes composed together
- adapters (map the context and rename arrows leaving the adapted node)

The state of a Rosmaro model is serializable and stored using a compatible storage mechanism.

Method calls may be synchronized using optional pessimistic locks.


## A simple example - The Prince of Rosmaro

```js
//That's a regular frog.
const frog = {
  introduce_yourself() {
    console.log("Ribbit! Ribbit!")
  }
}

//The Prince pays special attention to pizza.
const prince = {
  introduce_yourself() {
    console.log("I am The Prince of Rosmaro!")
  },
  eat(dish) {
    if (dish === "pizza") this.follow("ate_pizza")
  }
}

//An evil witch cast a spell on The Prince of Rosmaro.
//Nothing bad happens unless he eats a pizza!
const cursed_prince_description = {
  type: "graph",
  start: "prince",
  arrows: {
    prince: { ate_pizza: "frog" }
  },
  nodes: { prince, frog }
}

const cursed_prince = rosmaro(cursed_prince_description, storage, lock)

await cursed_prince.introduce_yourself() //I am The Prince of Rosmaro!
await cursed_prince.eat("yakisoba")
await cursed_prince.introduce_yourself() //I am The Prince of Rosmaro!
await cursed_prince.eat("pizza")
await cursed_prince.introduce_yourself() //Ribbit! Ribbit!
```
### Why is it interesting?

The frog is nothing but a frog. Knows just to how to do the _Ribbit!_ sound.

The Prince can introduce himself and if you give him a pizza, he follows the path of the one who ate a pizza. That's all he does.

The model of the Cursed Prince connects the Prince and the frog with the *ate_pizza* arrow.

This way the model of the frog, the model of the Prince and the model of the Cursed Prince stay separated.

Would you like to change the Prince into a unicorn instead of a frog? Or maybe into an electric kettle? Feel free! Just model the unicorn or the kettle and change what the *ate_pizza* arrow is pointing at! No need to change the Prince himself.

## Installing
```
$ npm i rosmaro
```
You'll also need compatible storage and locking mechanisms.

### Storages
Coming soon.

Name | Description | Url
--- | --- | ---
||

If you know a compatible storage which is not mentioned above, create a pull request! :)
### Locking mechanisms
Coming soon.

Name | Description | Url
--- | --- | ---
||

If you know a compatible locking mechanism which is not mentioned above, create a pull request! :)
