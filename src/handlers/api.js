import alterRes from './alterRes';
import defaultParams from './defaultParams';
import forParticularInstance from './forParticularInstance';
import nodeActions from './nodeActions';
import leaf from './leaf';
import {transparentCtxMapFn} from './utils';
import transparentHandler from './transparent';
import initCtx from './initCtx';
import dynamicNodes from './dynamicNodes';
import ctxSlice from './ctxSlice';
import reduce from "lodash/reduce";
import mapValues from 'lodash/mapValues';

const stages = [
  defaultParams,
  dynamicNodes,

  // It is very important that ctxSlice is applied before initCtx.
  // Otherwise it wouldn't be possible to specify the initial value of
  // the sliced context.
  ctxSlice,
  initCtx,

  alterRes,
  nodeActions,
  forParticularInstance,
  leaf
];

const transparent = {
  handler: transparentHandler,
  ctxMapFn: transparentCtxMapFn,
  nodes: ({ctx}) => ([])
};

/*
res like {
  handler: fn,
  ctxMapFn: in: fn, out: fn},
  nodes: fn
}
*/
const buildHandler = (handlerPlan = {}, stageIndex = 0) => {
  const stage = stages[stageIndex];
  if (stage) {
    const {make, remainingPlan} = stage(handlerPlan);
    return make(buildHandler(remainingPlan, stageIndex + 1));
  } else {
    return transparent;
  }
};

/*
res like {
  handlers: {
    node: fn,
    anotherNode: fn
  },
  ctxMapFns: {
    node: {in: fn, out: fn},
    anotherNode: {in: fn, out: fn},
  },
  nodes: {
    node: fn,
    anotherNode: fn
  }
}
*/
const buildAllHandlers = (handlersPlan, graph) => 
  reduce(handlersPlan, ({handlers, ctxMapFns, nodes}, handlerPlan, node) => {
    const {handler, ctxMapFn, nodes: newNodes} = buildHandler(handlerPlan);
    return {
      handlers: {
        ...handlers,
        [node]: handler
      },
      ctxMapFns: {
        ...ctxMapFns,
        [node]: ctxMapFn
      },
      nodes: {
        ...nodes,
        [node]: newNodes
      }
    };
  }, {
    handlers: {}, 
    ctxMapFns: mapValues(graph, () => transparentCtxMapFn), 
    nodes: {}
  });

export default buildAllHandlers;
