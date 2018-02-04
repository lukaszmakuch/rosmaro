import assert from 'assert';
import build, {mapMain} from './../src/graphBuilder/api';

const buildHandler = plan => ({built: plan});

describe('graph builder', () => {

  it('builds a graph with handlers', () => {

    const ctx = {
      'main': {
        'A': {elems: ['elemA', 'elemB']}
      }
    };

    const localNodeSliceFns = {
      in: ({src, localNodeName}) => src[localNodeName],
      out: ({src, localNodeName, returned}) => ({...src, [localNodeName]: returned})
    };

    const ctxMapFns = {
      'main': localNodeSliceFns,
      'main:A': localNodeSliceFns,
    };

    const AHandler = {
      dynamicParentMethod: () => {}
    };

    const ASubAHandler = {
      aMethod: () => {}
    };

    const bHandler = {
      afterAMethod: () => {}
    };

    const bSubChildHandler = {
      anotherLeafMethod: () => {}
    };

    const plan = {
      graph: {
        'main': {
          type: 'graph',
          nodes: {'A': 'A', 'B': 'B'},
          arrows: {
            'A': {
              x: {target: 'B', entryPoint: 'p'}
            }
          },
          entryPoints: {
            start: {target: 'A', entryPoint: 'start'}
          }
        },

        'A': {
          type: 'dynamicComposite',
          nodeTemplate: 'AGraph'
        },

        'AGraph': {
          type: 'graph',
          nodes: {A: 'ASubA'},
          arrows: {
            A: {x: {target: 'A', entryPoint: 'start'}},
          },
          entryPoints: {
            start: {target: 'A', entryPoint: 'start'}
          }
        },

        'ASubA': {type: 'leaf'},

        'B': {
          type: 'composite',
          nodes: {
            'A': 'BSub',
            'B': 'BSub'
          }
        },

        'BSub': {
          type: 'graph',
          nodes: {
            A: 'BSubA',
            B: 'BSubB'
          },
          arrows: {
            A: {
              x: {target: 'B', entryPoint: 'start'}
            }
          }, 
          entryPoints: {
            start: {target: 'A', entryPoint: 'start'},
            p: {target: 'B', entryPoint: 'start'}
          }
        },

        'BSubA': {type: 'leaf'},
        'BSubB': {type: 'leaf'}
      },

      handlers: {
        'A': {
          ...AHandler,
          nodes: ({ctx}) => ctx.elems
        },
        'ASubA': ASubAHandler,
        'B': bHandler,
        'BSubA': bSubChildHandler,
        'BSubB': bSubChildHandler
      },

    };

    const expected = {

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
          type: 'composite',
          nodes: ['main:A:elemA', 'main:A:elemB'],
          parent: 'main',
        },

        'main:A:elemA': {
          type: 'graph',
          nodes: ['main:A:elemA:A'],
          parent: 'main:A',
          arrows: {
            'main:A:elemA:A': {
              x: {target: 'main:A:elemA:A', entryPoint: 'start'}
            }
          },
          entryPoints: {
            start: {target: 'main:A:elemA:A', entryPoint: 'start'}
          },
        },

        'main:A:elemA:A': {type: 'leaf', parent: 'main:A:elemA'},

        'main:A:elemB': {
          type: 'graph',
          nodes: ['main:A:elemB:A'],
          parent: 'main:A',
          arrows: {
            'main:A:elemB:A': {
              x: {target: 'main:A:elemB:A', entryPoint: 'start'}
            }
          },
          entryPoints: {
            start: {target: 'main:A:elemB:A', entryPoint: 'start'}
          },
        },

        'main:A:elemB:A': {type: 'leaf', parent: 'main:A:elemB'},

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
            p: {target: 'main:B:A:B', entryPoint: 'start'}
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
            p: {target: 'main:B:B:B', entryPoint: 'start'}
          },
        },

        'main:B:B:A': {type: 'leaf', parent: 'main:B:B'},
        'main:B:B:B': {type: 'leaf', parent: 'main:B:B'},
        'main:B:A:A': {type: 'leaf', parent: 'main:B:A'},
        'main:B:A:B': {type: 'leaf', parent: 'main:B:A'}

      },

      handlers: {
        'main': {built: undefined},
        'main:A': {built: AHandler},
        'main:A:elemA': {built: undefined},
        'main:A:elemA:A': {built: ASubAHandler},
        'main:A:elemB': {built: undefined},
        'main:A:elemB:A': {built: ASubAHandler},
        'main:B': {built: bHandler},
        'main:B:A': {built: undefined},
        'main:B:B': {built: undefined},
        'main:B:B:A': {built: bSubChildHandler},
        'main:B:B:B': {built: bSubChildHandler},
        'main:B:A:A': {built: bSubChildHandler},
        'main:B:A:B': {built: bSubChildHandler}
      }

    };

    const built = build({plan, ctx, buildHandler});
    assert.deepEqual(built, expected);
  });

});

