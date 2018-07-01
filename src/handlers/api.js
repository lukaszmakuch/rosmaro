import {keys, identity as Ridentity, lens as Rlens} from 'ramda';
import transparentHandler from './transparent';

const identityLens = () => Rlens(Ridentity, Ridentity);

export default (handlersPlan, graph) => {
  return keys(graph).reduce((result, node) => {
    const plan = handlersPlan[node] || {};
    return {
      handlers: {
        ...result['handlers'],
        [node]: plan.handler || transparentHandler,
      },
      lenses: {
        ...result['lenses'],
        [node]: plan.lens || identityLens,
      },
      nodes: {
        ...result['nodes'],
        [node]: plan.nodes || (() => []),
      },
    }
  }, {});
};