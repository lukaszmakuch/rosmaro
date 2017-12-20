import assert from 'assert';
import rosmaro from '../src/index';
import lockTestDouble from './lockTestDouble';
import storageTestDouble from './storageTestDouble';

let logEntries = [];
let lock, storage;
const log = entry => logEntries.push(entry);

const graph = {

  'main': {
    type: 'graph',
    nodes: {'A': 'Graph', 'B': 'GraphTarget'},
    arrows: {
      'A': {
        'y': {target: 'B', entryPoint: 'start'}
      }
    },
    entryPoints: {start: {target: 'A', entryPoint: 'start'}}
  },

  'Graph': {
    type: 'graph',
    nodes: {'A': 'Composite', 'B': 'CompositeTarget'},
    arrows: {
      'A': {
        'x': {target: 'B', entryPoint: 'start'}
      }
    },
    entryPoints: {start: {target: 'A', entryPoint: 'start'}}
  },

  'Composite': {
    type: 'composite',
    nodes: {'A': 'OrthogonalA', 'B': 'OrthogonalB'}
  },

  'OrthogonalA': {type: 'leaf'},

  'OrthogonalB': {type: 'leaf'},

  'CompositeTarget': {type: 'leaf'},

  'GraphTarget': {type: 'leaf'}

};

const expectedLog = [

  // handling .a(1, 2)

  // locking
  'locking',
  'locked',

  // reading the storage
  'getting data',
  'got data',

  // handling the call request
  {node: 'main', method: 'a', params: [1, 2], ctx: {}},
  {node: 'Graph', method: 'a', params: [1, 2], ctx: {}},
  {node: 'Composite', method: 'a', params: [1, 2], ctx: {}},
  {node: 'OrthogonalA', method: 'a', params: [1, 2], ctx: {}},
  {node: 'OrthogonalB', method: 'a', params: [1, 2], ctx: {}},

  // onEntry actions
  {node: 'GraphTarget', method: 'onEntry', params: [], ctx: {fromA: 123, fromB: 456}},
  {node: 'CompositeTarget', method: 'onEntry', params: [], ctx: {fromA: 123, fromB: 456}},

  // afterLeft actions
  // {node: 'main', method: 'afterLeft', params: ['main:A:A:A'], ctx: {}},
  // {node: 'Graph', method: 'afterLeft', params: ['main:A:A:A'], ctx: {}},
  // {node: 'Composite', method: 'afterLeft', params: ['main:A:A:A'], ctx: {}},
  {node: 'OrthogonalA', method: 'afterLeft', params: [], ctx: {}},
  {node: 'OrthogonalB', method: 'afterLeft', params: [], ctx: {}},
  {node: 'Composite', method: 'afterLeft', params: [], ctx: {}},
  {node: 'CompositeTarget', method: 'afterLeft', params: [], ctx: {fromA: 123, fromB: 456}},
  {node: 'Graph', method: 'afterLeft', params: [], ctx: {}},

  // writing to the storage
  'setting data',
  'set data',

  // unlocking
  'unlocking',
  'unlocked',

  // handling .b(3, 4)

  // locking
  'locking',
  'locked',

  // reading the storage
  'getting data',
  'got data',

  // handling the call request
  {node: 'main', method: 'b', params: [3, 4], ctx: {fromA: 123, fromB: 456}},
  {node: 'GraphTarget', method: 'b', params: [3, 4], ctx: {fromA: 123, fromB: 456}},

  // writing to the storage
  'setting data',
  'set data',

  // unlocking
  'unlocking',
  'unlocked'

];

const expectedRes = {A: 'OrthogonalARes', B: 'OrthogonalBRes'};

const loggingHandler = (nodeName, res) => ({
  afterMethod(res) {
    log(nodeName);
    return res;
  },
  ...(res ? {method: () => {
    return res;
  }} : {})
});

const postpone = originalFn => {
  let resolveFn, rejectFn;

  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject
  });

  const fn = function () {
    return promise.then(() => {
      return originalFn(...arguments)
    });
  } 

  return {resolve: resolveFn, reject: rejectFn, fn};
};

describe('rosmaro', () => {

  beforeEach(() => {
    logEntries = [];
    lock = lockTestDouble(log);
    storage = storageTestDouble(log);
  });

  const mainHandler = loggingHandler('main');
  const OrthogonalAHandler = loggingHandler('OrthogonalA', {
    res: 'OrthogonalARes',
    arrow: 'y',
    ctx: {fromA: 123}
  });  
  const OrthogonalBHandler = loggingHandler('OrthogonalB', {
    res: 'OrthogonalBRes',
    arrow: 'x',
    ctx: {fromB: 456}
  });
  const CompositeHandler = loggingHandler('Composite');
  const GraphHandler = loggingHandler('Graph');
  const CompositeTargetHandler = loggingHandler('CompositeTarget', {ctx: {}});
  const GraphTargetHandler = loggingHandler('GraphTarget', {ctx: {}});
  const syncHandlers = {
    'main': mainHandler,
    'OrthogonalA': OrthogonalAHandler,
    'OrthogonalB': OrthogonalBHandler,
    'Composite': CompositeHandler,
    'Graph': GraphHandler,
    'CompositeTarget': CompositeTargetHandler,
    'GraphTarget': GraphTargetHandler
  };

  it('passes a reference to the whole model to handlers', () => {

    const graph = {
      'main': {type: 'leaf'}
    };

    let receivedReference;
    const handlers = {
      'main': {method: ({thisModel}) => {
        receivedReference = thisModel;
      }}
    };

    const model = rosmaro({
      graph,
      handlers,
      storage: storage,
      lock: lock.fn
    });

    model.method();

    assert(receivedReference === model);
  });

  describe('onTransition', () => {
    // one graph node which does a loop
    const graph = {
      'main': {
        type: 'graph',
        nodes: {A: 'A'},
        arrows: {
          'A': {self: {target: 'A', entryPoint: 'start'}}
        },
        entryPoints: {start: {target: 'A', entryPoint: 'start'}}
      },
      A: {type: 'leaf'}
    };

    // just the leaf which does a loop
    const handlers = {
      'A': {
        loop: () => ({arrow: 'self'})
      }
    };

    let model;

    beforeEach(() => {
      model = rosmaro({
          graph,
          handlers,
          storage: storage,
          lock: lock.fn,
          onTransition: () => log('a transition occurred')
        });
    });

    it('is triggered every time a transition occurs', () => {
      model.loop();

      assert.deepEqual(logEntries, [
        'locking',
        'locked',
        'getting data',
        'got data',

        // the transition occurred here

        'setting data',
        'set data',
        'unlocking',
        'unlocked',

        'a transition occurred'
      ]);
    });

    it('is not called when a transition does not occur', () => {
      model.methodWhichDoesNotCauseATransition();

      assert.deepEqual(logEntries, [
        'locking',
        'locked',
        'getting data',
        'got data',

        'setting data',
        'set data',
        'unlocking',
        'unlocked'
      ]);
    });
  
  });

  it('may be removed', () => {

    const graph = {
      'main': {
        type: 'graph',
        nodes: {A: 'A', B: 'B'},
        arrows: {
          'A': {x: {target: 'B', entryPoint: 'start'}},
          'B': {x: {target: 'A', entryPoint: 'start'}}
        },
        entryPoints: {start: {target: 'A', entryPoint: 'start'}}
      },
      'A': {type: 'leaf'},
      'B': {type: 'leaf'}
    };

    const handlers = {
      'main': {
        afterLeft: () => log('left main'),
      },

      'B': {
        afterLeft: () => log('left B'),
      },

      'A': {
        method: () => {
          return {ctx: {x: 'x'}, arrow: 'x', res: 'x'}
        },
        afterLeft: () => log('left A'),
      },
    };

    const model = rosmaro({
      graph,
      handlers,
      storage: storage,
      lock: lock.fn
    });

    //this puts the machine in the B state
    model.method();

    //the new machine state should be stored
    assert(undefined !== storage.get());

    //clearing the log
    logEntries = [];
    
    // removing
    model.remove();

    assert.deepEqual(logEntries, [
      'locking',
      'locked',
      'getting data',
      'got data',

      'left B',
      'left main',

      'setting data',
      'set data',
      'unlocking',
      'unlocked'
    ]);

    assert(undefined === storage.get());
  });

  it('changes node instance ID only in case of a transition', () => {

    const graph = {
      'main': {
        type: 'graph',
        nodes: {'A': 'node', 'B': 'node'},
        arrows: {
          'A': {x: {target: 'B', entryPoint: 'start'}}
        },
        entryPoints: {start: {target: 'A', entryPoint: 'start'}}
      },
      'node': {type: 'leaf'}
    };

    const handlers = {
      'node': {
        getID: ({thisNode: {ID}}) => ID,
        transition: () => ({arrow: 'x'})
      }
    };

    const model = rosmaro({
      graph,
      handlers,
      storage: storage,
      lock: lock.fn
    });

    const firstID = model.getID();
    const firstIDReadAgain = model.getID();
    model.transition();
    const secondID = model.getID();

    assert(firstID === firstIDReadAgain);
    assert(firstID !== secondID);

  });

  describe('unlocking', () => {
    const graph = {
      'main': {type: 'leaf'}
    };
    const expectedLog = [
      'locking',
      'locked',
      'getting data',
      'got data',
      'unlocking',
      'unlocked'
    ];

    it('calls unlock when a promise is rejected', async () => {
      let rejectHandler;
      const handlers = {
        'main': {
          method: () => new Promise((resolve, reject) => {
            rejectHandler = reject
          }),
        }
      };

      const model = rosmaro({
        graph,
        handlers,
        storage: storage,
        lock: lock.fn
      });

      const callRes = model.method();
      const reason = new Error('the error');
      rejectHandler(reason);
      let caught;
      try {
        await callRes;
      } catch (error) {
        caught = error;
      }

      assert.deepEqual(reason, caught);
      assert.deepEqual(logEntries, expectedLog);
    });

    it('calls unlock if an error is thrown', () => {
      const handlers = {
        'main': {
          'method': () => {
            throw new Error("thrown")
          }
        }
      };

      const model = rosmaro({
        graph,
        handlers,
        storage: storage,
        lock: lock.fn
      });

      assert.throws(() => model.method(), Error, /thrown/);
      assert.deepEqual(logEntries, expectedLog);
    });
    
  });

  describe('with async handlers', () => {
    const graph = {
      'main': {
        type: 'graph',
        nodes: {'A': 'A'},
        arrows: {},
        entryPoints: {start: {target: 'A', entryPoint: 'start'}}
      },
      'A': {type: 'leaf'}
    };

    it('rejects if an async handler rejects', async () => {
      storage.config({asyncSet: true});
      lock.config({asyncLock: true});
      let reject;
      const error = new Error();

      const promise = new Promise((resolve, rejectFn) => {
        reject = rejectFn;
      });

      const handlers = {
        'A': {
          method: () => promise
        }
      };

      const model = rosmaro({
        graph,
        handlers,
        storage: storage,
        lock: lock.fn
      });

      const resPromise = model.method();
      assert(resPromise.then);

      lock.doLock();
      reject(error);
      storage.doSet();

      let caught;
      try {
        await resPromise;
      } catch (thrown) {
        caught = thrown;
      }

      assert(error === caught);
    });

    it('synchronizes calls', async () => {
      storage.config({asyncGet: true});
      lock.config({asyncUnlock: true});
      let resolve;

      const promise = new Promise((resolveFn, reject) => {
        resolve = resolveFn;
      });

      const handlers = {
        'A': {
          method: () => promise
        }
      };

      const model = rosmaro({
        graph,
        handlers,
        storage: storage,
        lock: lock.fn
      });

      const resPromise = model.method();
      assert(resPromise.then);
      resolve('resolved result');
      storage.doGet();
      lock.doUnlock();
      const res = await resPromise;
      assert.equal('resolved result', res);
    });

  });

  describe('with synchronous handlers', () => {


    it('is fully synchronous if everything is synchronous', () => {
      const model = rosmaro({
        graph,
        handlers: syncHandlers,
        storage: storage,
        lock: lock.fn
      });

      const aRes = model.method(1, 2);
      const bRes = model.method(3, 4);

      assert.deepEqual(expectedRes, aRes);
    });

    it('is async if something is async', async () => {
      lock.config({asyncLock: true, asyncUnlock: false, lockError: null, unlockError: null});
      const model = rosmaro({
        graph,
        handlers: syncHandlers,
        storage: storage,
        lock: lock.fn
      });

      const aRes = model.method(1, 2);
      assert(aRes.then);
      lock.doLock();
      const resolvedARes = await aRes;
      const bRes = model.method(3, 4);
      lock.doLock();
      await bRes;

      assert.deepEqual(expectedRes, resolvedARes);
    });

  });

  it('supports a transition from A to B', () => {

    const graph = {
      'main': {
        type: 'graph',
        nodes: {A: 'A', B: 'B'},
        entryPoints: {start: {target: 'A', entryPoint: 'start'}},
        arrows: {
          'A': {x: {target: 'B', entryPoint: 'start'}}
        }
      },
      'A': {type: 'leaf'},
      'B': {type: 'leaf'},
    };

    const handlers = {
      'A': {
        followArrow: () => ({arrow: 'x'})
      },
      'B': {
        readNode: () => 'B'
      }
    };

    const model = rosmaro({
      graph,
      handlers,
      storage: storage,
      lock: lock.fn
    });

    model.followArrow();
    assert.equal('B', model.readNode());
    assert.equal(undefined, model.nonExistentMethod());
  });


});