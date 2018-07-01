# Handler builder

Given a structure like this
```
{
  Node: {
    handler: ({action, ctx, child, node}) => ({
      res,
      ctx,
      arrows: [[[null, 'some arrow']]]
    }),
    lens: lensObj,
    nodes: fn
  }
}
```
gives this
```
{
  handlers: {
    Node: ({action, ctx, child, node}) => ({
      res,
      ctx,
      arrows: [[[null, 'some arrow']]]
    })
  },
  lenses: {
    Node: lensObj
  },
  nodes: {
    Node: fn
  }
}

```

## Related test files
- test/handlers.js