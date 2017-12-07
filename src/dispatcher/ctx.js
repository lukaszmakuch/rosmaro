import deep from 'deep-diff';
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
    .filter(d => d.kind != "D")
    .forEach(d => applyChange(res, true, d))

  return res
};