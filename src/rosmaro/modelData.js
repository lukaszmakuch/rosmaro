/*
When no model data is stored (we're working with a new model),
the function exported from this file returns all the initial data:
- FSM state
- context
Also, when the graph changed due to dynamic composites, 
so there are some new nodes,
they will be given initial state and IDs.
*/
import {initState} from './../fsm/api';
import newID from 'uuid/v1';

const extendModelData = ({
  readModelData = {ctx: {}, FSMState: {}, instanceID: {}}, 
  graph}
) => ({
  FSMState: {...initState(graph), ...readModelData.FSMState},
  ctx: readModelData.ctx,
});

export default extendModelData;