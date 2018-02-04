import alterRes from './alterRes';
import defaultParams from './defaultParams';
import forParticularInstance from './forParticularInstance';
import nodeActions from './nodeActions';
import leaf from './leaf';
import transparentHandler from './transparent';
import initCtx from './initCtx';
import ctxSlice from './ctxSlice';
import reduce from "lodash/reduce";

const stages = [
  defaultParams,

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
  ctxMapFn: {
    in: ({src}) => src,
    out: ({returned}) => returned
  }
};

/*
res like {
  handler: fn,
  ctxMapFn: in: fn, out: fn},
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
  }
}
*/
const buildAllHandlers = handlersPlan => reduce(handlersPlan, ({handlers, ctxMapFns}, handlerPlan, node) => {
  const {handler, ctxMapFn} = buildHandler(handlerPlan);
  return {
    handlers: {
      ...handlers,
      [node]: handler
    },
    ctxMapFns: {
      ...ctxMapFns,
      [node]: ctxMapFn
    }
  };
}, {handlers: {}, ctxMapFns: {}});

export default buildAllHandlers;
