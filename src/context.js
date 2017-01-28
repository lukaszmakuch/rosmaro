const merge = contexts =>  contexts.reduce(
  (merged, single) => Object.assign({}, merged, single),
  {}
);

module.exports = { merge }
