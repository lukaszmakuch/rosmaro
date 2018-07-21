import rosmaro from './rosmaro/api';
import {lens} from 'ramda';
export default rosmaro;

export const initialValueLens = initialValue => lens(
  context => context === undefined ? initialValue : context,
  context => context,
);