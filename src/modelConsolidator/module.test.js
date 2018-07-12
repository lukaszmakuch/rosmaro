import consolidateModel from './api.js';
import assert from 'assert';

describe('model consolidator', () => {
  it('integrates external models', () => {

    const providedHandlers = {
      "main": {},
      "B": {},
      "OrthogonalA": {},
      "OrthogonalB": {},
      "MultipliedB": {},
      "MultipliedBChild": {},
      "SubMain": {},
      "SubA": {},
      "SubB": {},
    };

    const subModel = {
      graph: {
        "main": {
          "type": "graph",
          "nodes": {
            "A": "A",
            "B": "B"
          },
          "arrows": {
            "A": {
              "x": {
                "target": "B",
                "entryPoint": "start"
              }
            }
          },
          "entryPoints": {
            "start": {
              "target": "A",
              "entryPoint": "start"
            }
          }
        },
        "A": {
          "type": "leaf"
        },
        "B": {
          "type": "leaf"
        }
      },
      handlers: {
        'main': providedHandlers.SubMain,
        'A': providedHandlers.SubA,
        'B': providedHandlers.SubB,
      }
    };

    const mainModel = {
      graph: {
        "A": {
          "type": "external"
        },
        "main": {
          "type": "graph",
          "nodes": {
            "A": "A",
            "B": "B"
          },
          "arrows": {
            "A": {
              "x": {
                "target": "B",
                "entryPoint": "start"
              }
            }
          },
          "entryPoints": {
            "start": {
              "target": "A",
              "entryPoint": "start"
            }
          }
        },
        "B": {
          "type": "composite",
          "nodes": {
            "OrthogonalA": "OrthogonalA",
            "OrthogonalB": "OrthogonalB"
          }
        },
        "OrthogonalA": {
          "type": "leaf"
        },
        "OrthogonalB": {
          "type": "dynamicComposite",
          "nodeTemplate": "MultipliedB"
        },
        "MultipliedB": {
          "type": "graph",
          "nodes": {
            "A": "MultipliedBChild"
          },
          "arrows": {
            "A": {
              "loop": {
                "target": "A",
                "entryPoint": "start"
              }
            }
          },
          "entryPoints": {
            "start": {
              "target": "A",
              "entryPoint": "start"
            }
          }
        },
        "MultipliedBChild": {"type": "leaf"}
      },
      handlers: {
        "A": subModel,
        "main": providedHandlers.main,
        "B": providedHandlers.B,
        "OrthogonalA": providedHandlers.OrthogonalA,
        "OrthogonalB": providedHandlers.OrthogonalB,
        "MultipliedB": providedHandlers.MultipliedB,
        "MultipliedBChild": providedHandlers.MultipliedBChild,
      }
    };

    const consolidatedMainModel = consolidateModel(mainModel);

    const expectedConsolidationResult = {
      graph: {

        'main': {
          type: 'graph',
          nodes: ['main:A', 'main:B'],
          parent: null,
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
          parent: 'main',
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

        'main:A:A': {type: 'leaf', parent: 'main:A'},
        'main:A:B': {type: 'leaf', parent: 'main:A'},

        'main:B': {
          type: 'composite', 
          parent: 'main',
          nodes: ['main:B:OrthogonalA', 'main:B:OrthogonalB']
        },

        'main:B:OrthogonalA': {type: 'leaf', parent: 'main:B'},

        'main:B:OrthogonalB': {
          type: 'dynamicComposite', 
          parent: 'main:B',
        },

        'main:B:OrthogonalB:template': {
          type: 'graph',
          nodes: ['main:B:OrthogonalB:template:A'],
          parent: 'main:B:OrthogonalB',
          arrows: {
            'main:B:OrthogonalB:template:A': {
              'loop': {target: 'main:B:OrthogonalB:template:A', entryPoint: 'start'},
            },
          },
          entryPoints: {
            start: {target: 'main:B:OrthogonalB:template:A', entryPoint: 'start'},
          },
        },

        'main:B:OrthogonalB:template:A': {
          type: 'leaf',
          parent: 'main:B:OrthogonalB:template',
        }

      },

      handlers: {
        'main': providedHandlers.main,
        'main:A': providedHandlers.SubMain,
        'main:A:A': providedHandlers.SubA,
        'main:A:B': providedHandlers.SubB,
        'main:B': providedHandlers.B,
        'main:B:OrthogonalA': providedHandlers.OrthogonalA,
        'main:B:OrthogonalB': providedHandlers.OrthogonalB,
        'main:B:OrthogonalB:template': providedHandlers.MultipliedB,
        'main:B:OrthogonalB:template:A': providedHandlers.MultipliedBChild,
      },

    };

    assert.deepEqual(
      consolidatedMainModel,
      expectedConsolidationResult
    );

  });
});