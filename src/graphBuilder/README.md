# Graph builder

Given the context and a structure like this (which may contain dynamic composites):
```
{
  graph: {A: ..., B...},
  bindings: {A: {...}, B: {...}}
}
```

gives a structure like this (which contains only regular composites):
```
{
  graph: {A: ..., B...},
  handlers: {A: ..., B...},
  lenses: {A: ..., B...},
}
```