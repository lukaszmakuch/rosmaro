/*
map like {x: 'y'}
arrows like [
  [['main:a:a:a', 'x'], ['main:a:a', 'x'], ['main:a', 'x']],
  ...
]
res like [
  [['main:a:a:a', 'x'], ['main:a:a', 'x'], ['main:a', 'y']],
    ...
]
*/
export const mapArrows = (map, arrows) => arrows.map(arrow => {
  const previousOnes = arrow.slice(0, -1);
  const lastOne = arrow[arrow.length - 1];
  const newLastOne = map[lastOne[1]]
    ? [lastOne[0], map[lastOne[1]]]
    : lastOne;
  return [...previousOnes, newLastOne];
});

export const withResolved = (val, cb) => val.then 
  ? val.then(cb) 
  : cb(val);

export const extractPromises = maybePromises => maybePromises.reduce(
  (grouped, maybePromise) => {
    return maybePromise.then
      ? {
        ...grouped,
        promises: [...grouped.promises, maybePromise],
      }
      : {
        ...grouped,
        notPromises: [...grouped.notPromises, maybePromise],
      };
  },
  {promises: [], notPromises: []}
);