import deep from 'deep-diff';
import {reduce, concat, head, values} from 'ramda';
const diff = deep.diff
const applyChange = deep.applyChange

export const mergeCtxs = (original, newOnes) => {
  if (newOnes.length == 1) return newOnes[0];
  
  let diffs = newOnes
    .map(c => diff(original, c))
    .reduce((flat, arr) => [].concat(flat, arr), [])
  let res = {...original};

  diffs
    .filter(a => a)
    .forEach(d => applyChange(res, true, d))

  return res
};

export const mergeArrows = arrows => reduce(concat, [], arrows);

export const transparentSingleChildHandler = ({action, ctx, node, children}) => {
  const childRes = head(values(children))({action});
  return {
    ...childRes,
    arrows: addNodeToArrows(node.id, childRes.arrows),
  };
};

// arrows like [ [['a:a:a', 'x']] [['a:a:b', 'x']] ]
// node like 'a:a'
// res like [ [['a:a:a', 'x'], ['a:a', 'x']] [['a:a:b', 'x'], ['a:a', 'x']] ]
export const addNodeToArrows = (node, arrows) => {
  return arrows.map(arrow => node === 'main'
    ? arrow
    : [
      ...arrow,
      [node, arrow[arrow.length - 1][1]]
    ]
  );
}

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
export const renameArrows = (map, arrows) => arrows.map(arrow => {
  const previousOnes = arrow.slice(0, -1);
  const lastOne = arrow[arrow.length - 1];
  const newLastOne = map[lastOne[1]]
    ? [lastOne[0], map[lastOne[1]]]
    : lastOne;
  return [...previousOnes, newLastOne];
});
