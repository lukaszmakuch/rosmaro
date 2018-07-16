import consolidateModel from './api.js';
import assert from 'assert';

describe('model consolidator', () => {
  it('integrates external models', () => {

    const providedSubBindings = {
      "main": {},
      "main:A": {},
      "main:B": {},
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
      bindings: providedSubBindings
    };

    const providedMainBindings = {
      "main": {},
      "main:A": subModel,
      "main:B": {},
      "main:B:OrthogonalA": {},
      "main:B:OrthogonalB": {},
      "main:B:OrthogonalB:child": {},
      "main:B:OrthogonalB:child:A": {},
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
          "child": "MultipliedB"
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
      bindings: providedMainBindings
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

        'main:B:OrthogonalB:child': {
          type: 'graph',
          nodes: ['main:B:OrthogonalB:child:A'],
          parent: 'main:B:OrthogonalB',
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
          parent: 'main:B:OrthogonalB:child',
        }

      },

      bindings: {
        "main": providedMainBindings["main"],
        "main:A": providedSubBindings["main"],
        "main:A:A": providedSubBindings["main:A"],
        "main:A:B": providedSubBindings["main:B"],
        "main:B": providedMainBindings["main:B"],
        "main:B:OrthogonalA": providedMainBindings["main:B:OrthogonalA"],
        "main:B:OrthogonalB": providedMainBindings["main:B:OrthogonalB"],
        "main:B:OrthogonalB:child": providedMainBindings["main:B:OrthogonalB:child"],
        "main:B:OrthogonalB:child:A": providedMainBindings["main:B:OrthogonalB:child:A"],
      },

    };

    assert.deepEqual(
      consolidatedMainModel,
      expectedConsolidationResult
    );

  });
});