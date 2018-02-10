/*
When no model data is stored (we're working with a new model),
the function exported from this file returns all the initial data:
- FSM state
- context
- IDs of nodes
Also, when the graph changed due to dynamic composites, 
so there are some new nodes,
they will be given initial state and IDs.
*/
import {initState} from './../fsm/api';
import newID from 'uuid/v1';

export const generateInstanceID = (graph, alreadyGenerated = {}) => 
  Object.keys(graph).reduce((ids, node) => ({
    ...ids,
    [node]: alreadyGenerated[node] || newID()
  }), {});

const extendModelData = ({
  readModelData = {ctx: {}, FSMState: {}, instanceID: {}}, 
  graph}
) => ({
  FSMState: {...initState(graph), ...readModelData.FSMState},
  ctx: readModelData.ctx,
  instanceID: generateInstanceID(graph, readModelData.instanceID)
});

export default extendModelData;