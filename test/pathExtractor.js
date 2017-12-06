import assert from 'assert';
import extractPath from './../src/pathExtractor';

const testExtracting = ({
  graph,
  targetNode,
  expected
}) => () => {
  const {graph: gotGraph, FSMState: gotFSMState} = extractPath(graph, targetNode);
  assert.deepEqual(expected.graph, gotGraph);
  assert.deepEqual(expected.FSMState, gotFSMState);
};

describe("graph path extractor", () => {
  describe('returning the root as a leaf', () => {
    it('may be actually a leaf', testExtracting({

      graph: {
        'main': {type: 'leaf', parent: null}
      },

      targetNode: 'main',

      expected:{

        graph: {
          'main': {type: 'leaf', parent: null}
        },

        FSMState: {}
      }

    }));
  });

  it('returns a graph as a leaf', testExtracting({

    graph: {
      'main': {type: 'graph', parent: null}
    },

    targetNode: 'main',

    expected:{

      graph: {
        'main': {type: 'leaf', parent: null}
      },

      FSMState: {}
    }

  }));

  it('returns a composite as a leaf', testExtracting({

    graph: {
      'main': {type: 'composite', parent: null}
    },

    targetNode: 'main',

    expected:{

      graph: {
        'main': {type: 'leaf', parent: null}
      },

      FSMState: {}
    }

  }));
  it('allows to reach a particular node as a leaf', testExtracting({
    
    graph: {
      'main': {type: 'graph', nodes: ['main:A', 'main:B']},
      'main:A': {type: 'leaf', parent: 'main'},
      'main:B': {type: 'composite', nodes: ['main:B:A', 'main:B:B'], parent: 'main'},
      'main:B:A': {type: 'graph', nodes: ['main:B:A:A', 'main:B:A:B'], parent: 'main:B'},
      'main:B:A:A': {type: 'leaf', parent: 'main:B:A'},
      'main:B:A:B': {type: 'graph', children: ['main:B:A:B:A'], parent: 'main:B:A'},
      'main:B:A:B:A': {type: 'leaf', parent: 'main:B:A:B'},
      'main:B:B:': {type: 'leaf', parent: 'main:B'}
    },

    targetNode: 'main:B:A:B',
    
    expected: {
      
      graph: {
        'main': {type: 'graph', nodes: ['main:B']},
        'main:B': {type: 'composite', nodes: ['main:B:A'], parent: 'main'},
        'main:B:A': {type: 'graph', nodes: ['main:B:A:B'], parent: 'main:B'},
        'main:B:A:B': {type: 'leaf', parent: 'main:B:A'}
      },
      
      FSMState: {
        'main': 'main:B',
        'main:B:A': 'main:B:A:B'
      }

    },
  }));
});