import assert from 'assert';
import fsm from './../src/fsm';

const testTransition = ({graph, FSMState, arrows, expectedRes}) => () => {
  const actualRes = fsm({graph, FSMState, arrows});
  assert.deepEqual(expectedRes, actualRes);
};

const expectError = ({graph, FSMState, arrows}) => () => {
  const actualRes = fsm({graph, FSMState, arrows});
  //TODO: implement this
  assert(false);
};

describe('fsm', () => {

  describe('one level graph', () => {

    describe('correct transition', () => {

      it('handles transitions to a different node', testTransition({

        graph: {

          main: {
            type: 'graph',
            nodes: ['main:A', 'main:B', 'mainC'],
            parent: null,
            arrows: {
              'main:B': {
                x: {target: 'main:A', entryPoint: 'start'},
                y: {target: 'main:C', entryPoint: 'start'},
              }
            },
            entryPoints: {
              start: {target: 'main:B', entryPoint: 'start'}
            }
          },

          'main:A': {type: 'leaf', parent: 'main'},
          'main:B': {type: 'leaf', parent: 'main'},
          'main:C': {type: 'leaf', parent: 'main'}

        },

        FSMState: {
          'main': 'main:B'
        },

        arrows: [[['main:B', 'y']]],

        expectedRes: {
          leftNodes: ['main:B'],
          enteredNodes: ['main:C'],
          FSMState: {
            'main': 'main:C'
          }
        }

      }));

      it('supports loops', testTransition({

        graph: {

          main: {
            type: 'graph',
            nodes: ['main:A'],
            parent: null,
            arrows: {
              'main:A': {
                self: {target: 'main:A', entryPoint: 'start'}
              }
            },
            entryPoints: {
              start: {target: 'main:A', entryPoint: 'start'}
            }
          },

          'main:A': {
            type: 'leaf',
            parent: 'main'
          }

        },

        FSMState: {
          'main': 'main:A'
        },

        arrows: [[['main:A', 'self']]],

        expectedRes: {
          leftNodes: [],
          enteredNodes: [],
          FSMState: {
            'main': 'main:A'
          }
        }

      }));

    });

    describe('incorrect transition', () => {

      xit('cannot leave the root', expectError({

        graph: {

          main: {
            type: 'graph',
            nodes: ['main:A'],
            arrows: {
              'main:A': {}
            },
            entryPoints: {
              start: {target: 'main:A', entryPoint: 'start'}
            },
            parent: null
          },

          'main:A': {type: 'leaf', parent: 'main'}

        },

        FSMState: {
          'main': 'main:A'
        },

        arrow: [[['main:A', 'x']]]

      }));

    });

  });

  describe('nested graph', () => {

    describe('correct transition', () => {

      it('supports transitions within a nested graph', testTransition({

        graph: {

          main: {
            type: 'graph',
            parent: null,
            nodes: ['main:A', 'main:B'],
            arrows: {
              //this should never be used (and we want to make sure it's never used)
              'main:A': {
                x: {target: 'main:B', entryPoint: 'start'}
              }
            },
            entryPoints: {
              start: {target: 'main:A', entryPoint: 'start'}
            }
          },

          'main:A': {
            type: 'graph',
            parent: 'main',
            nodes: ['main:A:A', 'main:A:B'],
            arrows: {
              //this one is the one meant to be followed
              'main:A:A': {
                x: {target: 'main:A:B', entryPoint: 'start'}
              }
            },
            entryPoints: {
              start: {target: 'main:A:A', entryPoint: 'start'}
            }
          },

          'main:B': {type: 'leaf', parent: 'main'},
          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'}

        },

        arrows: [[['main:A:A', 'x']]],

        FSMState: {
          'main': 'main:A',
          'main:A': 'main:A:A'
        },

        expectedRes: {
          FSMState: {
            'main': 'main:A',
            'main:A': 'main:A:B'
          },
          leftNodes: ['main:A:A'],
          enteredNodes: ['main:A:B']
        }

      }));

      it('may go outside the graph', testTransition({

        graph: {

          'main': {
            type: 'graph',
            nodes: ['main:A', 'main:B'],
            parent: null,
            entryPoints: {
              start: {target: 'main:A', entryPoint: 'start'}
            },
            arrows: {
              'main:A': {
                y: {target: 'main:B', entryPoint: 'start'}
              }
            }
          },

          'main:A': {
            type: 'graph',
            nodes: ['main:A:A', 'main:A:B'],
            parent: 'main',
            entryPoints: {
              start: {target: 'main:A:A', entryPoint: 'start'}
            },
            arrows: {
              'main:A:A': {
                x: {target: 'main:A:B', entryPoint: 'start'}
              }
            }
          },

          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},
          'main:B': {type: 'leaf', parent: 'main'}

        },

        FSMState: {
          'main': 'main:A',
          'main:A': 'main:A:A'
        },

        arrows: [[['main:A:A', 'y'], ['main:A', 'y']]],

        expectedRes: {
          FSMState: {
            'main': 'main:B',
            'main:A': 'main:A:A'
          },
          leftNodes: ['main:A:A', 'main:A'],
          enteredNodes: ['main:B']
        }

      }));

    });

    describe('incorrect transition', () => {});

  });

  describe('composite', () => {
    describe('correct transition', () => {

      it('handles entry points for composed nodes', testTransition({
        graph: {

          'main': {
            type: 'graph',
            nodes: ['main:A', 'main:B'],
            parent: null,
            arrows: {
              'main:A': {
                x: {target: 'main:B', entryPoint: 'p'}
              },
              'main:B': {}
            },
            entryPoints: {
              start: {target: 'main:A', entryPoint: 'start'}
            }
          },

          'main:A': {
            type: 'leaf',
            parent: 'main'
          },

          'main:B': {
            type: 'composite',
            nodes: ['main:B:A', 'main:B:B'],
            parent: 'main'
          },

          'main:B:A': {
            type: 'graph',
            nodes: ['main:B:A:A', 'main:B:A:B'],
            parent: 'main:B',
            arrows: {
              'main:B:A:A': {
                x: {target: 'main:B:A:B', entryPoint: 'start'}
              },
              'main:B:A:B': {}
            },
            entryPoints: {
              start: {target: 'main:B:A:A', entryPoint: 'start'},
              p: {target: 'main:B:A:B', entryPoint: 'start'},
            }
          },

          'main:B:B': {
            type: 'graph',
            nodes: ['main:B:B:A', 'main:B:B:B'],
            parent: 'main:B',
            arrows: {
              'main:B:B:A': {
                x: {target: 'main:B:B:B', entryPoint: 'start'}
              },
              'main:B:B:B': {}
            },
            entryPoints: {
              start: {target: 'main:B:B:A', entryPoint: 'start'},
              p: {target: 'main:B:B:B', entryPoint: 'start'},
            }
          },

          'main:B:B:A': {
            type: 'leaf',
            parent: 'main:B:B'
          },

          'main:B:B:B': {
            type: 'leaf',
            parent: 'main:B:B'
          },

          'main:B:A:A': {
            type: 'leaf',
            parent: 'main:B:A'
          },

          'main:B:A:B': {
            type: 'leaf',
            parent: 'main:B:A'
          }

        },

        FSMState: {
          'main': 'main:A',
          'main:B:A': 'main:B:A:A',
          'main:B:B': 'main:B:B:A'
        },

        arrows: [
          [['main:A', 'x'], ['main', 'x']]
        ],

        expectedRes: {
          FSMState: {
            'main': 'main:B',
            'main:B:A': 'main:B:A:B',
            'main:B:B': 'main:B:B:B'
          },
          leftNodes: ['main:A'],
          enteredNodes: ['main:B', 'main:B:A', 'main:B:B', 'main:B:A:B', 'main:B:B:B']
        }

      }));
      
    });

  });

});