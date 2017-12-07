import assert from 'assert';
import build, {mapMain} from './../src/graphBuilder/api';

describe('graph builder', () => {

  it('provides a function to decorate the main handler of a plan', () => {

    const originalMainHandler = b => b;
    const originalAnotherHandler = a => a

    const plan = {
      graph: {},
      handlers: {
        'main': originalMainHandler,
        'another': originalAnotherHandler
      },
      external: {}
    };

    const newMain = c => c;

    const decoratedPlan = mapMain(plan, main => {
      assert.strictEqual(main, originalMainHandler);
      return newMain;
    });

    assert.deepStrictEqual(decoratedPlan.external, plan.external);
    assert.deepStrictEqual(decoratedPlan.graph, plan.graph);
    assert.deepStrictEqual(
      decoratedPlan.handlers.another, 
      plan.handlers.another
    );
    assert.deepStrictEqual(
      decoratedPlan.handlers.main, 
      newMain
    );
  });

  it('turns a graph plan into a graph with handlers', () => {

    const graphPlan = {

      'main': {
        type: 'graph',
        nodes: {
          A: 'A',
          B: 'B'
        },
        arrows: {
          A: {
            x: {target: 'B', entryPoint: 'p'}
          }
        },
        entryPoints: {
          start: {target: 'A', entryPoint: 'start'}
        }
      },

      'A': {type: 'external'},

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

    const handlers = {
      'main': function () {},
      'B': function () {},
      'BSub': function () {},
      'BSubA': function () {},
      'BSubB': function () {}
    };

    const external = {
      A: {
        graph: {
          'main': {
            type: 'graph',
            nodes: {A: 'A', B: 'A'},
            arrows: {
              A: {x: {target: 'B', entryPoint: 'start'}}
            },
            entryPoints: {start: {target: 'A', entryPoint: 'start'}}
          },
          A: {type: 'leaf'}
        },
        handlers: {
          'main': function() {},
          'A': function() {}
        }
      }
    };

    const expectedGraph = {

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
        type: 'graph',
        parent: 'main',
        nodes: ['main:A:A', 'main:A:B'],
        arrows: {
          'main:A:A': {x: {target: 'main:A:B', entryPoint: 'start'}},
          'main:A:B': {}
        },
        entryPoints: {start: {target: 'main:A:A', entryPoint: 'start'}}
      },

      'main:A:A': {type: 'leaf', parent: 'main:A'},
      'main:A:B': {type: 'leaf', parent: 'main:A'},

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

    };

    const expectedHandlers = {
      'main': handlers['main'],
      'main:A': external['A'].handlers['main'],
      'main:A:A': external['A'].handlers['A'],
      'main:A:B': external['A'].handlers['A'],
      'main:B': handlers['B'],
      'main:B:A': handlers['BSub'],
      'main:B:A:A': handlers['BSubA'],
      'main:B:A:B': handlers['BSubB'],
      'main:B:B': handlers['BSub'],
      'main:B:B:A': handlers['BSubA'],
      'main:B:B:B': handlers['BSubB']
    };

    const built = build({graph: graphPlan, handlers, external});
    assert.deepEqual(built.graph, expectedGraph);
    assert.deepStrictEqual(built.handlers, expectedHandlers);
  });
});

