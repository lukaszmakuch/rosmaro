import alterRes from './alterRes';
import defaultParams from './defaultParams';
import forParticularInstance from './forParticularInstance';
import nodeActions from './nodeActions';
import leaf from './leaf';
import transparent from './transparent';
import initCtx from './initCtx';
import ctxSlice from './ctxSlice';

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

const buildHandler = (handlerPlan = {}, stageIndex = 0) => {
  const stage = stages[stageIndex];
  if (stage) {
    const {make, remainingPlan} = stage(handlerPlan);
    return make(buildHandler(remainingPlan, stageIndex + 1));
  } else {
    return transparent;
  }
};

export default buildHandler;
