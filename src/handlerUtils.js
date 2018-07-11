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

export const transparentSingleChildHandler = ({action, ctx, children}) => {
  return head(values(children))({action});
};