import {initState} from './../fsm/api';
import newID from 'uuid/v1';

export const generateInstanceID = graph => Object.keys(graph).reduce((ids, node) => ({
  ...ids,
  [node]: newID()
}), {});

const newModelData = graph => ({
  FSMState: initState(graph),
  ctx: {},
  instanceID: generateInstanceID(graph)
});
 export default newModelData;