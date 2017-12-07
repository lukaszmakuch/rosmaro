export const mapMain = (plan, mapFn) => ({
  ...plan,
  handlers: {
    ...plan.handlers,
    main: mapFn(plan.handlers.main)
  }
});