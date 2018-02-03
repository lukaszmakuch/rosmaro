import assert from 'assert';
import graphDiff from './../src/fsm/graphDiff';

const graphA = {
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

  'main:B': {
    type: 'composite',
    nodes: ['main:B:A', 'main:B:B']
  },

  'main:B:A': {type: 'leaf'},
  'main:B:B': {type: 'leaf'}
};

const FSMStateA = {
  'main': 'main:A',
  'main:A': 'main:A:A'
};

const graphB = {
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

  'main:B': {
    type: 'composite',
    nodes: ['main:B:A', 'main:B:C']
  },

  'main:B:A': {type: 'leaf'},
  'main:B:C': {type: 'leaf'}
};

const FSMStateB = {
  'main': 'main:B',
  'main:A': 'main:A:B'
};

const graphC = {

  'main': {
    type: 'composite',
    nodes: ['main:A', 'main:B'],
  },

  'main:A': {
    type: 'graph',
    nodes: ['main:A:A']
  },

  'main:A:A': {type: 'leaf'},

  'main:B': {
    type: 'graph',
    nodes: ['main:B:A']
  },

  'main:B:A': {type: 'leaf'}
};

const FSMStateC = {
  'main:A': 'main:A:A',
  'main:B': 'main:B:A'
};

const graphD = {

  'main': {
    type: 'composite',
    nodes: ['main:A', 'main:C'],
  },

  'main:A': {
    type: 'graph',
    nodes: ['main:A:A']
  },

  'main:A:A': {type: 'leaf'},

  'main:C': {
    type: 'graph',
    nodes: ['main:C:A']
  },

  'main:C:A': {type: 'leaf'}
};

const FSMStateD = {
  'main:A': 'main:A:A',
  'main:C': 'main:C:A'
};

describe('graph diff', () => {

  it('handles a case where there is no new graph', () => {
    assert.deepEqual(graphDiff({
      oldGraph: graphA, 
      oldFSMState: FSMStateA
    }), ({
      leftNodes: ['main:A:A:A', 'main:A:A:B', 'main:A:A', 'main:A', 'main'],
      enteredNodes: []
    }));
  });

  it('provides the list of entered and left nodes in level order', () => {
    assert.deepEqual(graphDiff({
      oldGraph: graphA, 
      oldFSMState: FSMStateA,
      newGraph: graphB, 
      newFSMState: FSMStateB
    }), ({
      leftNodes: ['main:A:A:A', 'main:A:A:B', 'main:A:A', 'main:A:B', 'main:A'],
      enteredNodes: ['main:B', 'main:B:C', 'main:B:A', 'main:A:B']
    }));
  });

  it('spots differences between composites', () => {
    assert.deepEqual(graphDiff({
      oldGraph: graphC, 
      oldFSMState: FSMStateC,
      newGraph: graphD, 
      newFSMState: FSMStateD
    }), ({
      leftNodes: ['main:B:A', 'main:B'],
      enteredNodes: ['main:C', 'main:C:A']
    }));
  });
  
});
