import assert from 'assert';
import extractPath from './../src/pathExtractor';

const testExtracting = ({
  wholeGraph,
  targetNode,
  expected
}) => () => {
  const {graph: graph, FSMState} = extractPath(wholeGraph, targetNode);
  assert.deepEqual(expected.graph, graph);
  assert.deepEqual(expected.FSMState, FSMState);
};

describe("graph path extractor", () => {
  describe('returning the root as a leaf', () => {
    it('may be actually a leaf', testExtracting({

      wholeGraph: {type: 'leaf'},

      targetNode: '',

      expected:{

        graph: {type: 'leaf'},

        FSMState: {}
      }

    }));
  });

  it('returns a graph as a leaf', testExtracting({

    wholeGraph: {type: 'graph'},

    targetNode: '',

    expected:{

      graph: {type: 'leaf'},

      FSMState: {}
    }

  }));

  it('returns a composite as a leaf', testExtracting({

    wholeGraph: {type: 'composite'},

    targetNode: '',

    expected:{

      graph: {type: 'leaf'},

      FSMState: {}
    }

  }));
  it('allows to reach a particular node as a leaf', testExtracting({
    
    wholeGraph: {
      type: 'graph',
      nodes: {
        A: {type: 'leaf'},
        B: {
          type: 'composite',
          nodes: {
            A: {
              type: 'graph',
              nodes: {
                A: {type: 'leaf'},
                B: {
                  type: 'graph',
                  nodes: {
                    A: {type: 'leaf'}
                  }
                }
              }
            },
            B: {type: 'leaf'}
          }
        }
      }
    },

    targetNode: 'B:A:B',
    
    expected: {
      
      graph: {
        type: 'graph',
        nodes: {
          B: {
            type: 'composite',
            nodes: {
              A: {
                type: 'graph',
                nodes: {
                  B: {type: 'leaf'}
                }
              }
            }
          }
        }
      },
      
      FSMState: {
        '': 'B',
        'B:A': 'B'
      }

    },
  }));
});