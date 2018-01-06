import alterRes from './alterRes';
import defaultParams from './defaultParams';
import forParticularInstance from './forParticularInstance';
import nodeActions from './nodeActions';
import leaf from './leaf';
import transparent from './transparent';
import initCtx from './initCtx';

const stages = [
  defaultParams,

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
