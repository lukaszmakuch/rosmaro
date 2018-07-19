import consolidateModels from './../modelConsolidator/api';
import expandGraph from './../graphBuilder/api';
import fsm from './../fsm/api';
import {nonEmptyArrow, removeUnusedFSMState} from './../utils/all';
import dispatch from './../dispatcher/api';
import extendModelData from './modelData';

// {graph, bindings}
export default (modelDescription) => {
  const consolidatedModel = consolidateModels(modelDescription);

  return ({state, action}) => {
    // {graph, handlers, lenses}
    const modelParts = expandGraph({
      plan: consolidatedModel, 
      context: state ? state.context : {}
    });

    // {FSMState, context}
    const modelData = extendModelData({
      state,
      graph: modelParts.graph
    });

    // {arrows, context, result}
    const dispatchRes = dispatch({
      graph: modelParts.graph,
      FSMState: modelData.FSMState,
      handlers: modelParts.handlers,
      context: modelData.context,
      action,
      lenses: modelParts.lenses,
    });

    // adds newFSMState
    const newFSMState = fsm({
      graph: modelParts.graph, 
      FSMState: modelData.FSMState, 
      arrows: dispatchRes.arrows
    });

    // adds newModelParts (so we know the new graph)
    const newModelParts = expandGraph({
      plan: consolidatedModel, 
      context: dispatchRes.context
    });

    const anyArrowFollowed = dispatchRes.arrows.some(nonEmptyArrow);

    return {
      state: {
        FSMState: removeUnusedFSMState({
          newFSMState, 
          graph: newModelParts.graph
        }),
        context: dispatchRes.context,
      },
      anyArrowFollowed,
      result: dispatchRes.result
    };

  };

};