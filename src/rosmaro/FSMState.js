/*
If there's anything missing within the state, 
like the context or some FSM state,
it is given the default value.
*/
import {initState} from './../fsm/api';

const extendFSMState = ({
  state = {context: {}, FSMState: {}}, 
  graph}
) => ({...initState(graph), ...state.FSMState});

export default extendFSMState;