import assert from 'assert';
import {view, set, lensProp} from 'ramda';
import expand from './api';

const testLens = ({
  lens, 
  zoomInInput, 
  zoomInOutput,
  zoomOutInput,
  zoomOutOutput,
}) => {
  assert.deepEqual(
    zoomInOutput,
    view(lens, zoomInInput)
  );
  assert.deepEqual(
    zoomOutOutput,
    set(lens, zoomOutInput, zoomInInput)
  );
};

// TODO: move this to some kind of a test utilities library
const assertIdentityLens = lens => testLens({
  lens, 
  zoomInInput: {a: 123, b: 456}, 
  zoomInOutput: {a: 123, b: 456},
  zoomOutInput: {z: 456, x: 678},
  zoomOutOutput: {z: 456, x: 678},
});

// TODO: rename this test suite
describe('the new graph builder', () => {

  it('expands dynamic composites and segregates graphs, handlers, nodes and lenses', () => {
    const modelDescription = {
      graph: {

        'main': {
          type: 'graph',
          nodes: ['main:A', 'main:B'],
          arrows: {
            'main:A': {
              'x': {target: 'main:B', entryPoint: 'start'},
            },
            'main:B': {},
          },
          entryPoints: {
            start: {target: 'main:A', entryPoint: 'start'},
          },
        },

        'main:A': {
          type: 'graph',
          nodes: ['main:A:A', 'main:A:B'],
          arrows: {
            'main:A:A': {
              'x': {target: 'main:A:B', entryPoint: 'start'},
            },
            'main:A:B': {},
          },
          entryPoints: {
            start: {target: 'main:A:A', entryPoint: 'start'},
          },
        },

        'main:A:A': {type: 'leaf'},
        'main:A:B': {type: 'leaf'},

        'main:B': {
          type: 'composite', 
          nodes: ['main:B:OrthogonalA', 'main:B:OrthogonalB']
        },

        'main:B:OrthogonalA': {type: 'leaf'},

        'main:B:OrthogonalB': {
          type: 'dynamicComposite', 
        },

        'main:B:OrthogonalB:child': {
          type: 'graph',
          nodes: ['main:B:OrthogonalB:child:A'],
          arrows: {
            'main:B:OrthogonalB:child:A': {
              'loop': {target: 'main:B:OrthogonalB:child:A', entryPoint: 'start'},
            },
          },
          entryPoints: {
            start: {target: 'main:B:OrthogonalB:child:A', entryPoint: 'start'},
          },
        },

        'main:B:OrthogonalB:child:A': {
          type: 'leaf',
        }

      },

      bindings: {
        'main': {
          lens: () => lensProp('first'),
          handler: function () {},
        },
        'main:A': {
          handler: function () {},
        },
        'main:A:A': {
          handler: function () {},
        },
        'main:A:B': {
          handler: function () {},
        },
        'main:B': {
          lens: ({localNodeName}) => lensProp(localNodeName),
          handler: function () {},
        },
        'main:B:OrthogonalA': {
          handler: function () {},
        },
        'main:B:OrthogonalB': {
          lens: ({localNodeName}) => lensProp(localNodeName),
          nodes: ({context}) => context['main:B:OrthogonalB nodes'],
          handler: function () {},
        },
        'main:B:OrthogonalB:child': {
          handler: function () {},
        },
        'main:B:OrthogonalB:child:A': {
          handler: function () {},
        },
      },

    };

    const context = {
      first: {
        B: {
          OrthogonalB: {
            'main:B:OrthogonalB nodes': ['DynamicChildA', 'DynamicChildB']
          }
        }
      }
    };

    const expectedGraphExpansion = {
        'main': {
          type: 'graph',
          nodes: ['main:A', 'main:B'],
          arrows: {
            'main:A': {
              'x': {target: 'main:B', entryPoint: 'start'},
            },
            'main:B': {},
          },
          entryPoints: {
            start: {target: 'main:A', entryPoint: 'start'},
          },
        },

        'main:A': {
          type: 'graph',
          nodes: ['main:A:A', 'main:A:B'],
          arrows: {
            'main:A:A': {
              'x': {target: 'main:A:B', entryPoint: 'start'},
            },
            'main:A:B': {},
          },
          entryPoints: {
            start: {target: 'main:A:A', entryPoint: 'start'},
          },
        },

        'main:A:A': {type: 'leaf'},
        'main:A:B': {type: 'leaf'},

        'main:B': {
          type: 'composite', 
          nodes: ['main:B:OrthogonalA', 'main:B:OrthogonalB']
        },

        'main:B:OrthogonalA': {type: 'leaf'},

        'main:B:OrthogonalB': {
          type: 'composite',
          nodes: [
            'main:B:OrthogonalB:DynamicChildA', 
            'main:B:OrthogonalB:DynamicChildB',
          ],
        },

        'main:B:OrthogonalB:DynamicChildA': {
          type: 'graph',
          nodes: ['main:B:OrthogonalB:DynamicChildA:A'],
          arrows: {
            'main:B:OrthogonalB:DynamicChildA:A': {
              'loop': {target: 'main:B:OrthogonalB:DynamicChildA:A', entryPoint: 'start'},
            },
          },
          entryPoints: {
            start: {target: 'main:B:OrthogonalB:DynamicChildA:A', entryPoint: 'start'},
          },
        },

        'main:B:OrthogonalB:DynamicChildA:A': {
          type: 'leaf',
        },

        'main:B:OrthogonalB:DynamicChildB': {
          type: 'graph',
          nodes: ['main:B:OrthogonalB:DynamicChildB:A'],
          arrows: {
            'main:B:OrthogonalB:DynamicChildB:A': {
              'loop': {target: 'main:B:OrthogonalB:DynamicChildB:A', entryPoint: 'start'},
            },
          },
          entryPoints: {
            start: {target: 'main:B:OrthogonalB:DynamicChildB:A', entryPoint: 'start'},
          },
        },

        'main:B:OrthogonalB:DynamicChildB:A': {
          type: 'leaf',
        },
    };

    const expectedHandlersExpansion = {
      'main': modelDescription.bindings['main'].handler,
      'main:A': modelDescription.bindings['main:A'].handler,
      'main:A:A': modelDescription.bindings['main:A:A'].handler,
      'main:A:B': modelDescription.bindings['main:A:B'].handler,
      'main:B': modelDescription.bindings['main:B'].handler,
      'main:B:OrthogonalA': modelDescription.bindings['main:B:OrthogonalA'].handler,
      'main:B:OrthogonalB': modelDescription.bindings['main:B:OrthogonalB'].handler,
      'main:B:OrthogonalB:DynamicChildA': modelDescription.bindings['main:B:OrthogonalB:child'].handler,
      'main:B:OrthogonalB:DynamicChildA:A': modelDescription.bindings['main:B:OrthogonalB:child:A'].handler,
      'main:B:OrthogonalB:DynamicChildB': modelDescription.bindings['main:B:OrthogonalB:child'].handler,
      'main:B:OrthogonalB:DynamicChildB:A': modelDescription.bindings['main:B:OrthogonalB:child:A'].handler,
    };

    const expanded = expand({plan: modelDescription, context});
    assert.deepEqual(expanded.handlers, expectedHandlersExpansion);
    assert.deepEqual(expanded.graph, expectedGraphExpansion);

    testLens({
      lens: expanded.lenses['main'](), 
      zoomInInput: {a: 42, first: 7}, 
      zoomInOutput: 7,
      zoomOutInput: 9,
      zoomOutOutput: {a: 42, first: 9},
    });

    testLens({
      lens: expanded.lenses['main:B']({localNodeName: 'b'}), 
      zoomInInput: {a: 42, b: 7}, 
      zoomInOutput: 7,
      zoomOutInput: 9,
      zoomOutOutput: {a: 42, b: 9},
    });

    testLens({
      lens: expanded.lenses['main:B:OrthogonalB']({localNodeName: 'c'}), 
      zoomInInput: {a: 42, c: 7}, 
      zoomInOutput: 7,
      zoomOutInput: 9,
      zoomOutOutput: {a: 42, c: 9},
    });

    assertIdentityLens(expanded.lenses['main:A']());
    assertIdentityLens(expanded.lenses['main:A:A']());
    assertIdentityLens(expanded.lenses['main:A:B']());
    assertIdentityLens(expanded.lenses['main:B:OrthogonalA']());
    assertIdentityLens(expanded.lenses['main:B:OrthogonalB:DynamicChildA']());
    assertIdentityLens(expanded.lenses['main:B:OrthogonalB:DynamicChildA:A']());
    assertIdentityLens(expanded.lenses['main:B:OrthogonalB:DynamicChildB']());
    assertIdentityLens(expanded.lenses['main:B:OrthogonalB:DynamicChildB:A']());

  });

});