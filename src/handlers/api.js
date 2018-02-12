import alterRes from './alterRes';
import defaultParams from './defaultParams';
import forParticularNode from './forParticularNode';
import leaf from './leaf';
import {transparentCtxTransformFn} from './utils';
import transparentHandler from './transparent';
import initCtx from './initCtx';
import ctxTransform from './ctxTransform';
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
  ctxTransform,

  alterRes,
  forParticularNode,
  leaf
];

const transparent = {
  handler: transparentHandler,
  ctxTransformFn: transparentCtxTransformFn,
  nodes: ({ctx}) => ([])
};

/*
res like {
  handler: fn,
  ctxTransformFn: in: fn, out: fn},
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
  ctxTransformFns: {
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
  reduce(handlersPlan, ({handlers, ctxTransformFns, nodes}, handlerPlan, node) => {
    const {handler, ctxTransformFn, nodes: newNodes} = buildHandler(handlerPlan);
    return {
      handlers: {
        ...handlers,
        [node]: handler
      },
      ctxTransformFns: {
        ...ctxTransformFns,
        [node]: ctxTransformFn
      },
      nodes: {
        ...nodes,
        [node]: newNodes
      }
    };
  }, {
    handlers: {}, 
    ctxTransformFns: mapValues(graph, () => transparentCtxTransformFn), 
    nodes: {}
  });

export default buildAllHandlers;
