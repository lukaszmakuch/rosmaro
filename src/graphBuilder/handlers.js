/*
Applies mapFn to mainFn within a plan like {
  handlers: {main: mainFn, ...},
  ...
}
*/
export const mapMain = (plan, mapFn) => ({
  ...plan,
  handlers: {
    ...plan.handlers,
    main: mapFn(plan.handlers.main)
  }
});