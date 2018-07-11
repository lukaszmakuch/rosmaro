import {map} from 'ramda';

export default (opts) => {
  return map(
    (childFn) => childFn(opts.action),
    opts.children
  );
}