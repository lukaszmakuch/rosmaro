/*
If there's anything missing within the state, 
like the context or some FSM state,
it is given the default value.
*/
import {initState} from './../fsm/api';

const extendModelData = ({
  state = {context: {}, FSMState: {}}, 
  graph}
) => ({
  FSMState: {...initState(graph), ...state.FSMState},
  context: state.context,
});

export default extendModelData;