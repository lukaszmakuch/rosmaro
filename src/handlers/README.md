# Handler builder

The end-user, coding the behavior of a node, uses a convenient structure with many shortcuts. 

Example:
```
const Node = {

  initCtx: {val: 42},

  method ({ctx, paramA}) => {
    return {
      arrow: 'x',
      res: ctx.val * 2
    }
  }

}
```

The structure returned by buildHandler always has the following signature:
```
{
  handlers: {
    Node: ({method, ctx, params, model, child, node}) => ({
      res,
      ctx,
      arrows: [[[null, 'some arrow']]]
    })
  },
  ctxMapFns: {
    Node: {
      in: ({src, localNodeName}) => ctx,
      out: ({src, localNodeName, returned}) => ctx
    }
  }
}

```

This is the format used by the dispatcher module.

The point is that the user may write code which is easier to understand and makes it hard to shoot herself in the foot, while the dispatcher module always uses the same function signature and nothing else.

## Related test files
- test/handlers.js