import alterRes from './alterRes';
import defaultParams from './defaultParams';
import thisModelNode from './thisModelNode';
import leaf from './leaf';
import transparentHandler from './transparent';
import initCtx from './initCtx';
import methodMap from './methodMap';
import ctxLens from './ctxLens';
import dynamicNodes from './dynamicNodes';
import ctxSlice from './ctxSlice';
import reduce from "lodash/reduce";
import mapValues from 'lodash/mapValues';
import {identity as Ridentity, lens as Rlens} from 'ramda';

const stages = [
  defaultParams,
  dynamicNodes,

  // It is very important that ctxSlice is applied before initCtx.
  // Otherwise it wouldn't be possible to specify the initial value of
  // the sliced context.
  ctxSlice,
  initCtx,
  ctxLens,

  methodMap,
  alterRes,
  thisModelNode,
  leaf
];

const identityLens = () => Rlens(Ridentity, Ridentity);

/*
res like {
  handler: fn,
  lens
  nodes: fn
}
*/
const buildHandler = (handlerPlan = {}, stageIndex = 0) => {
  const stage = stages[stageIndex];
  if (stage) {
    const {make, remainingPlan} = stage(handlerPlan);
    return make(buildHandler(remainingPlan, stageIndex + 1));
  } else {
    return {
      handler: transparentHandler,
      lens: identityLens,
      nodes: ({ctx}) => ([])
    };
  }
};

/*
res like {
  handlers: {
    node: fn,
    anotherNode: fn
  },
  lenses: {
    node,
    anotherNode,
  },
  nodes: {
    node: fn,
    anotherNode: fn
  }
}
*/
const buildAllHandlers = (handlersPlan, graph) => 
  reduce(handlersPlan, ({handlers, lenses, nodes}, handlerPlan, node) => {
    const {handler, lens, nodes: newNodes} = buildHandler(handlerPlan);
    return {
      handlers: {
        ...handlers,
        [node]: handler
      },
      lenses: {
        ...lenses,
        [node]: lens
      },
      nodes: {
        ...nodes,
        [node]: newNodes
      }
    };
  }, {
    handlers: {}, 
    lenses: mapValues(graph, () => identityLens), 
    nodes: {}
  });

export default buildAllHandlers;
