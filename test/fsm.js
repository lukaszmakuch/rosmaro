import assert from 'assert';
import fsm, {initState} from './../src/fsm/api';

const testTransition = ({graph, FSMState, arrows, expectedRes}) => () => {
  const actualRes = fsm({graph, FSMState, arrows});
  assert.deepEqual(expectedRes, actualRes);
};

const expectError = ({graph, FSMState, arrows}) => () => {
  const actualRes = fsm({graph, FSMState, arrows});
  assert(actualRes === 'fail');
};

describe('fsm', () => {

  it('has initial state', () => {

    const graph = {
      main: {
        type: 'graph',
        nodes: ['main:A', 'main:B'],
        entryPoints: {
          start: {target: 'main:A', entryPoint: 'p'},
          another: {target: 'main:B', entryPoint: 'another'}
        }
      },
      'main:A': {
        type: 'composite',
        nodes: ['main:A:A', 'main:A:B']
      },
      'main:A:A': {type: 'leaf'},
      'main:A:B': {
        type: 'graph',
        nodes: ['main:A:B:A', 'main:A:B:B'],
        entryPoints: {
          start: {target: 'main:A:B:A', entryPoint: 'start'},
          p: {target: 'main:A:B:B', entryPoint: 'start'}
        }
      },
      'main:A:B:A': {type: 'leaf'},
      'main:A:B:B': {type: 'leaf'},
      'main:B': {
        type: 'graph',
        nodes: ['main:B:A', 'main:B:B'],
        entryPoints: {
          'start': {target: 'main:B:A', entryPoint: 'start'},
          'another': {target: 'main:B:B', entryPoint: 'start'}
        }
      },
      'main:B:A': {type: 'leaf'},
      'main:B:B': {type: 'leaf'},

    };

    const gotInitState = initState(graph);
    const expectedInitState = {
      'main': 'main:A',
      'main:A:B': 'main:A:B:B',
      'main:B': 'main:B:A'
    };
    assert.deepEqual(expectedInitState, gotInitState);

  });

  it('does NOT need to cause a transition', testTransition({

    graph: {

      'main': {
        type: 'graph',
        nodes: ['main:A', 'main:B'],
        parent: null,
        arrows: {
          'main:A': {
            x: {target: 'main:B', entryPoint: 'start'}
          },
          'main:B': {}
        },
        entryPoints: {start: {target: 'main:A', entryPoint: 'start'}}
      },

      'main:A': {type: 'leaf', parent: 'main'},
      'main:B': {type: 'leaf', parent: 'main'},

    },

    FSMState: {'main': 'main:A'},

    arrows: [[['main:A', undefined]]],

    expectedRes: {
      leftNodes: [],
      enteredNodes: [],
      FSMState: {'main': 'main:A'}
    }

  }));

  describe('one level graph', () => {

    describe('correct transition', () => {

      it('handles transitions to a different node', testTransition({

        graph: {

          main: {
            type: 'graph',
            nodes: ['main:A', 'main:B', 'main:C'],
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

      it('cannot leave the root', expectError({

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

        arrows: [[['main:A', 'x']]]

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

      it('may do a loop to :start', testTransition({

        graph: {

          'main': {
            type: 'graph',
            nodes: ['main:A'],
            parent: null,
            arrows: {
              'main:A': {
                x: {target: 'main:A', entryPoint: 'start'}
              }
            },
            entryPoint: {
              start: {target: 'main:A', entryPoint: 'start'}
            }
          },

          'main:A': {
            type: 'graph',
            nodes: ['main:A:A', 'main:A:B'],
            parent: 'main',
            arrows: {
              'main:A:A': {
                x: {target: 'main:A:B', entryPoint: 'start'}
              },
              'main:A:B': {}
            },
            entryPoints: {
              start: {target: 'main:A:A', entryPoint: 'start'}
            }
          },

          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},

        },

        FSMState: {
          'main': 'main:A',
          'main:A': 'main:A:B'
        },

        arrows: [[['main:A:B', 'x'], ['main:A', 'x']]],

        expectedRes: {
          FSMState: {
            'main': 'main:A',
            'main:A': 'main:A:A'
          },
          leftNodes: ['main:A:B'],
          enteredNodes: ['main:A:A']
        }

      }));

      it('may do a loop to :history', testTransition({

        graph: {

          'main': {
            type: 'graph',
            nodes: ['main:A'],
            parent: null,
            arrows: {
              'main:A': {
                x: {target: 'main:A', entryPoint: 'history'}
              }
            },
            entryPoint: {
              start: {target: 'main:A', entryPoint: 'start'}
            }
          },

          'main:A': {
            type: 'graph',
            nodes: ['main:A:A', 'main:A:B'],
            parent: 'main',
            arrows: {
              'main:A:A': {
                x: {target: 'main:A:B', entryPoint: 'start'}
              },
              'main:A:B': {}
            },
            entryPoints: {
              history: {target: 'recent', entryPoint: 'start'},
              start: {target: 'main:A:A', entryPoint: 'start'}
            }
          },

          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},

        },

        FSMState: {
          'main': 'main:A',
          'main:A': 'main:A:B'
        },

        arrows: [[['main:A:B', 'x'], ['main:A', 'x']]],

        expectedRes: {
          FSMState: {
            'main': 'main:A',
            'main:A': 'main:A:B'
          },
          leftNodes: [],
          enteredNodes: []
        }

      }));

      it('may have a custom entry point', testTransition({

        graph: {

          'main': {
            type: 'graph',
            parent: null,
            nodes: ['main:A', 'main:B'],
            arrows: {
              'main:B': {
                'x': {target: 'main:A', entryPoint: 'center'}
              },
              'main:A': {}
            },
            entryPoints: {
              start: {target: 'main:A', entryPoint: 'start'}
            }
          },

          'main:A': {
            type: 'graph',
            parent: 'main',
            nodes: ['main:A:A', 'main:A:B', 'main:A:C'],
            arrows: {
              'main:A:A': {
                x: {target: 'main:A:A', entryPoint: 'start'}
              },
              'main:A:B': {
                x: {target: 'main:A:C', entryPoint: 'start'}
              },
              'main:A:C': {}
            },
            entryPoints: {
              start: {target: 'main:A:A', entryPoint: 'start'},
              center: {target: 'main:A:B', entryPoint: 'start'}
            }
          },

          'main:A:A': {type: 'leaf', parent: 'main'},
          'main:A:B': {type: 'leaf', parent: 'main'},
          'main:A:C': {type: 'leaf', parent: 'main'},

          'main:B': {type: 'leaf', parent: 'main'}

        },

        FSMState: {
          'main': 'main:B',
          'main:A': 'main:A:C'
        },

        arrows: [[['main:B', 'x']]],

        expectedRes: {
          FSMState: {
            'main': 'main:A',
            'main:A': 'main:A:B'
          },
          leftNodes: ['main:B'],
          enteredNodes: ['main:A', 'main:A:B']
        }

      }));

    });

    describe('incorrect transition', () => {});

  });

  describe('composite', () => {
    describe('correct transition', () => {

      it('within two composed graphs', testTransition({

        graph: {

          main: {
            type: 'composite',
            nodes: ['main:A', 'main:B'],
            parent: null
          },

          'main:A': {
            type: 'graph',
            parent: 'main',
            arrows: {
              'main:A:A': {
                x: {target: 'main:A:B', entryPoint: 'start'}
              }
            },
            nodes: ['main:A:A', 'main:A:B'],
            entryPoints: {start: {target: 'main:A:A', entryPoint: 'start'}}
          },

          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},

          'main:B': {
            type: 'graph',
            parent: 'main',
            arrows: {
              'main:B:A': {
                x: {target: 'main:B:B', entryPoint: 'start'}
              }
            },
            nodes: ['main:B:A', 'main:B:B'],
            entryPoints: {start: {target: 'main:B:A', entryPoint: 'start'}}
          },

          'main:B:A': {type: 'leaf', parent: 'main:B'},
          'main:B:B': {type: 'leaf', parent: 'main:B'},

        },

        FSMState: {
          'main:A': 'main:A:A',
          'main:B': 'main:B:A',
        },

        arrows: [
          [['main:A:A', 'x']],
          [['main:B:A', 'x']],
        ],

        expectedRes: {
          FSMState: {
            'main:A': 'main:A:B',
            'main:B': 'main:B:B',
          },
          leftNodes: ['main:A:A', 'main:B:A'],
          enteredNodes: ['main:B:B', 'main:A:B']
        }

      }));

      it('goes from two nodes to one', testTransition({

        graph: {

          'main': {
            type: 'graph',
            nodes: ['main:A', 'main:B'],
            arrows: {
              'main:A': {
                x: {target: 'main:B', entryPoint: 'start'}
              }
            },
            parent: null,
            entryPoints: {start: {target: 'main:A', entryPoint: 'start'}}
          },

          'main:A': {
            type: 'composite',
            parent: 'main',
            nodes: ['main:A:A', 'main:A:B']
          },

          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},
          'main:B': {type: 'leaf', parent: 'main'}

        },

        arrows: [
          [['main:A:A', 'x'], ['main:A', 'x']],
          [['main:A:B', 'x'], ['main:A', 'x']],
        ],

        FSMState: {
          'main': 'main:A'
        },

        expectedRes: {
          FSMState: {
            'main': 'main:B'
          },
          leftNodes: ['main:A:A', 'main:A:B', 'main:A'],
          enteredNodes: ['main:B']
        }

      }));

      it('leaving a composite means leaving all of its nodes', testTransition({

        graph: {

          main: {
            type: 'graph',
            nodes: ['main:A', 'main:B'],
            parent: null,
            arrows: {
              'main:A': {x: {target: 'main:B', entryPoint: 'start'}}
            }
          },

          'main:A': {
            type: 'composite',
            parent: 'main',
            nodes: ['main:A:A', 'main:A:B']
          },

          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},
          'main:B': {type: 'leaf', parent: 'main'},

        },

        arrows: [[['main:A:A', 'x'], ['main:A', 'x']]],

        FSMState: {
          'main': 'main:A'
        },

        expectedRes: {
          FSMState: {
            'main': 'main:B'
          },
          leftNodes: ['main:A:A', 'main:A:B', 'main:A'],
          enteredNodes: ['main:B']
        }

      }));

      it('goes from two orthogonal nodes to two nodes on different levels', testTransition({

        graph: {

          'main': {
            type: 'graph',
            parent: null,
            nodes: ['main:A', 'main:B'],
            arrows: {
              'main:A': {y: {target: 'main:B', entryPoint: 'start'}}
            },
            entryPoints: {start: {target: 'main:A', entryPoint: 'start'}}
          },

          'main:A': {
            type: 'graph',
            parent: 'main',
            nodes: ['main:A:A', 'main:A:B'],
            arrows: {
              'main:A:A': {x: {target: 'main:A:B', entryPoint: 'start'}}
            },
            entryPoints: {start: {target: 'main:A:A', entryPoint: 'start'}}
          },

          'main:A:A': {
            type: 'composite',
            parent: 'main:A',
            nodes: ['main:A:A:A', 'main:A:A:B']
          },

          'main:A:A:A': {type: 'leaf', parent: 'main:A:A'},
          'main:A:A:B': {type: 'leaf', parent: 'main:A:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},
          'main:B': {type: 'leaf', parent: 'main'}

        },

        arrows: [
          [['main:A:A:A', 'x'], ['main:A:A', 'x'], ['main:A', 'x']],
          [['main:A:A:B', 'y'], ['main:A:A', 'y'], ['main:A', 'y']]
        ],

        FSMState: {
          'main': 'main:A',
          'main:A': 'main:A:A'
        },

        expectedRes: {
          FSMState: {
            'main': 'main:B',
            'main:A': 'main:A:B'
          },
          leftNodes: ['main:A:A:A', 'main:A:A:B', 'main:A:A', 'main:A:B', 'main:A'],
          enteredNodes: ['main:B', 'main:A:B']
        }

      }));

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
          enteredNodes: ['main:B', 'main:B:B', 'main:B:A', 'main:B:B:B', 'main:B:A:B']
        }

      }));
      
    });

    describe('incorrect transition', () => {

      it('cannot make two nodes of the same graph active', expectError({

        graph: {

          'main': {
            type: 'graph',
            parent: null,
            nodes: ['main:A', 'main:B', 'main:C'],
            arrows: {
              'main:A': {
                x: {target: 'main:C', entryPoint: 'start'},
                y: {target: 'main:B', entryPoint: 'start'},
              }
            },
            entryPoints: {start: {target: 'main:A', entryPoint: 'start'}}
          },

          'main:A': {
            type: 'composite',
            parent: 'main',
            nodes: ['main:A:A', 'main:A:B']
          },

          'main:A:A': {type: 'leaf', parent: 'main:A'},
          'main:A:B': {type: 'leaf', parent: 'main:A'},
          'main:B': {type: 'leaf', parent: 'main'},
          'main:C': {type: 'leaf', parent: 'main'}

        },

        FSMState: {
          'main': 'main:A'
        },

        arrows: [
          [['main:A:B', 'x'], ['main:A', 'x']],
          [['main:A:A', 'y'], ['main:A', 'y']],
        ]

      }));

    });

  });

});