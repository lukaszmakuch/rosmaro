import assert from 'assert';
import fsm from './../src/fsm';

describe('fsm', () => {

  describe('composite', () => {

    it('handles entry points for composed nodes', () => {

      const graph = {

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

      };

      const FSMState = {
        'main': 'main:A',
        'main:B:A': 'main:B:A:A',
        'main:B:B': 'main:B:B:A'
      };

      const arrows = [
        [['main:A', 'x'], ['main', 'x']]
      ];

      const expectedRes = {
        FSMState: {
          'main': 'main:B',
          'main:B:A': 'main:B:A:B',
          'main:B:B': 'main:B:B:B'
        },
        leftNodes: ['main:A'],
        enteredNodes: ['main:B', 'main:B:A', 'main:B:B', 'main:B:A:B', 'main:B:B:B']
      };

      const actualRes = fsm({graph, FSMState, arrows});

      assert.deepEqual(expectedRes, actualRes);

    });

  });

});