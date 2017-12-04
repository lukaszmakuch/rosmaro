import assert from 'assert';
import fsm from './../src/fsm';

const testTransition = ({graph, FSMState, arrows, expectedRes}) => () => {
  const actualRes = fsm({graph, FSMState, arrows});
  assert.deepEqual(expectedRes, actualRes);
};

describe('fsm', () => {

  describe('one level graph', () => {

    describe('correct transition', () => {

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

    })

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