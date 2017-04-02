const deep = require('deep-diff')
const diff = deep.diff
const applyChange = deep.applyChange

const merge_contexts = (original_context, new_contexts) => {
  const diffs = new_contexts
    .map(c => diff(original_context, c))
    .reduce((flat, arr) => [].concat(flat, arr), [])
  let res = Object.assign({}, original_context)
  diffs
    .filter(a => a)
    .filter(d => d.kind != "D")
    .forEach(d => applyChange(res, true, d))

  return res
}

module.exports = { merge_contexts }
