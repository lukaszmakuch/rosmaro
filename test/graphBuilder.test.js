import assert from 'assert';
import build, {mapMain} from './../src/graphBuilder/api';
import {identity as Ridentity, lens as Rlens, lensPath as RlensPath} from 'ramda';

const buildHandler = plan => ({built: plan});

describe('graph builder', () => {

  it('builds a graph with handlers', () => {

    const ctx = {
      'main': {
        'A': {elems: ['elemA', 'elemB']}
      }
    };

    const localNodeLens = ({localNodeName}) => RlensPath([localNodeName]);
    const identityLens = () => Rlens(Ridentity, Ridentity);

    const lenses = {
      'main': localNodeLens,
      'A': localNodeLens,
      'AGraph': identityLens,
      'ASubA': identityLens,
      'B': identityLens,
      'BSub': identityLens,
      'BSubA': identityLens,
      'BSubB': identityLens,
    };

    const emptyNodes = () => [];
    const nodesFromElems = ({ctx}) => ctx.elems;

    const nodes = {
      'main': emptyNodes,
      'A': nodesFromElems,
      'AGraph': emptyNodes,
      'ASubA': emptyNodes,
      'B': emptyNodes,
      'BSub': emptyNodes,
      'BSubA': emptyNodes,
      'BSubB': emptyNodes,
    };

    const handlers = {
      'main': () => {},
      'A': () => {},
      'AGraph': () => {},
      'ASubA': () => {},
      'B': () => {},
      'BSub': () => {},
      'BSubA': () => {},
      'BSubB': () => {},
    };

    const graphPlan = {
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
        'main': handlers.main,
        'main:A': handlers.A,
        'main:A:elemA': handlers.AGraph,
        'main:A:elemA:A': handlers.ASubA,
        'main:A:elemB': handlers.AGraph,
        'main:A:elemB:A': handlers.ASubA,
        'main:B': handlers.B,
        'main:B:A': handlers.BSub,
        'main:B:B': handlers.BSub,
        'main:B:B:A': handlers.BSubA,
        'main:B:B:B': handlers.BSubB,
        'main:B:A:A': handlers.BSubA,
        'main:B:A:B': handlers.BSubB,
      },

      lenses: {
        'main': lenses.main,
        'main:A': lenses.A,
        'main:A:elemA': lenses.AGraph,
        'main:A:elemA:A': lenses.ASubA,
        'main:A:elemB': lenses.AGraph,
        'main:A:elemB:A': lenses.ASubA,
        'main:B': lenses.B,
        'main:B:A': lenses.BSub,
        'main:B:B': lenses.BSub,
        'main:B:B:A': lenses.BSubA,
        'main:B:B:B': lenses.BSubB,
        'main:B:A:A': lenses.BSubA,
        'main:B:A:B': lenses.BSubB,
      }

    };

    const built = build({
      plan: graphPlan,
      lenses,
      nodes,
      handlers,
      ctx,
    });

    assert.deepEqual(built, expected);
  });

});

