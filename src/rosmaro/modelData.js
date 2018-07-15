/*
If there's anything missing within the state, 
like the context or some FSM state,
it is given the default value.
*/
import {initState} from './../fsm/api';

const extendModelData = ({
  state = {ctx: {}, FSMState: {}}, 
  graph}
) => ({
  FSMState: {...initState(graph), ...state.FSMState},
  ctx: state.ctx,
});

export default extendModelData;