import assert from 'assert';
import graphDiff from './../src/fsm/graphDiff';

const graph = {

  'main': {
    type: 'graph',
    nodes: ['main:A', 'main:B']
  },

  'main:A': {
    type: 'graph',
    nodes: ['main:A:A', 'main:A:B']
  },

  'main:A:A': {
    type: 'composite',
    nodes: ['main:A:A:A', 'main:A:A:B']
  },

  'main:A:A:A': {type: 'leaf'},
  'main:A:A:B': {type: 'leaf'},
  'main:A:B': {type: 'leaf'},
  'main:B': {type: 'leaf'}

};

describe('graph diff', () => {

  it('handles a case where there is no newFSMState', () => {
    const oldFSMState = {
      'main': 'main:A',
      'main:A': 'main:A:A'
    };


    assert.deepEqual(graphDiff({graph, oldFSMState}), ({
      leftNodes: ['main:A:A:A', 'main:A:A:B', 'main:A:A', 'main:A', 'main'],
      enteredNodes: []
    }));
  });

  it('provides the list of entered and left nodes in level order', () => {

    const oldFSMState = {
      'main': 'main:A',
      'main:A': 'main:A:A'
    };

    const newFSMState = {
      'main': 'main:B',
      'main:A': 'main:A:B'
    };

    assert.deepEqual(graphDiff({graph, oldFSMState, newFSMState}), ({
      leftNodes: ['main:A:A:A', 'main:A:A:B', 'main:A:A', 'main:A:B', 'main:A'],
      enteredNodes: ['main:B', 'main:A:B']
    }));

  });
  
});
