import consolidateModels from './../modelConsolidator/api';
import expandGraph from './../graphBuilder/api';
import fsm from './../fsm/api';
import {nonEmptyArrow} from './../utils/all';
import dispatch from './../dispatcher/api';
import extendModelData from './modelData';

const hasAnyArrowBeenFollowed = arrows => arrows.some(nonEmptyArrow);

const removeUnusedFSMState = ({newFSMState, graph}) => {
  const minimalFSMState = Object.keys(graph).reduce((FSMState, node) => {
    const existingState = newFSMState[node];
    if (!existingState) return FSMState;
    return {
      ...FSMState,
      [node]: newFSMState[node]
    };
  }, {});
  return minimalFSMState;
};

// {graph, bindings}
export default (modelDescription) => {

  const consolidatedModel = consolidateModels(modelDescription);
  
  return ({state, action}) => {
    // {graph, handlers, lenses}
    const modelParts = expandGraph({
      plan: consolidatedModel, 
      ctx: state ? state.ctx : {}
    });

    // {FSMState, ctx}
    const modelData = extendModelData({
      readModelData: state,
      graph: modelParts.graph
    });

    // {arrows, ctx, res}
    const dispatchRes = dispatch({
      graph: modelParts.graph,
      FSMState: modelData.FSMState,
      handlers: modelParts.handlers,
      instanceID: modelData.instanceID,
      ctx: modelData.ctx,
      action,
      lenses: modelParts.lenses,
    });

    // adds newFSMState
    const newFSMState = fsm({
      graph: modelParts.graph, 
      FSMState: modelData.FSMState, 
      arrows: dispatchRes.arrows
    });

    const anyArrowFollowed = hasAnyArrowBeenFollowed(dispatchRes.arrows);

    // adds newModelParts (so we know the new graph)
    const newModelParts = expandGraph({
      plan: consolidatedModel, 
      ctx: dispatchRes.ctx
    });

    return {
      state: {
        FSMState: removeUnusedFSMState({
          newFSMState, 
          graph: newModelParts.graph
        }),
        instanceID: {},
        ctx: dispatchRes.ctx,
      },
      anyArrowFollowed,
      res: dispatchRes.res
    };

  };

};