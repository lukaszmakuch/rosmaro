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

const loggingHandler = (node, ownRes) => ({method, params, ctx, child}) => {
  log({node, method, params, ctx});
  if (ownRes) return {
    arrows: [[[null, ownRes.arrow]]],
    res: ownRes.res,
    ctx: ownRes.ctx
  };

  return child({method, params, ctx});
};

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

  xit('passes a reference to the whole model to handlers', () => {

    const graph = {
      'main': {type: 'leaf'}
    };

    let receivedReference;
    const handlers = {
      'main': ({model}) => {
        receivedReference = model;
        return {ctx: {}, arrows: [[[null, null]]]};
      }
    };

    const model = rosmaro({
      graph,
      handlers,
      storage: storage,
      lock: lock.fn
    });

    model.action();

    assert(receivedReference === model);
  });

  xit('may be removed', () => {

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
      'main': loggingHandler('main'),
      'A': loggingHandler('A', {ctx: {x: 'x'}, arrow: 'x', res: 'x'}),
      'B': loggingHandler('B', {ctx: {x: 'x'}, arrow: 'x', res: 'x'})
    };

    const model = rosmaro({
      graph,
      handlers,
      storage: storage,
      lock: lock.fn
    });

    //this puts the machine in the B state
    model.follow();

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

      {node: 'B', method: 'afterLeft', params: [], ctx: {x: 'x'}},
      {node: 'main', method: 'afterLeft', params: [], ctx: {x: 'x'}},

      'setting data',
      'set data',
      'unlocking',
      'unlocked'
    ]);

    assert(undefined === storage.get());
  });

  xit('changes node instance ID only in case of a transition', () => {

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
      'node': ({method, node: {instanceID}}) => {
        if (method === 'getID') return {
          res: instanceID,
          arrows: [[[null, null]]],
          ctx: {}
        };

        return {
          arrows: [[[null, 'x']]],
          ctx: {}
        };
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

  xdescribe('unlocking', () => {
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
        'main': () => new Promise((resolve, reject) => {
          rejectHandler = reject
        }),
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
        'main': () => {
          throw new Error("thrown")
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

  xdescribe('with async handlers', () => {

    let asyncHandlers, asyncMainHandler, asyncOrthogonalAHandler,
      asyncOrthogonalBHandler, asyncCompositeHandler, asyncGraphHandler,
      asyncCompositeTargetHandler, asyncGraphTargetHandler;
    beforeEach(() => {
      asyncMainHandler = postpone(mainHandler);
      asyncOrthogonalAHandler = postpone(OrthogonalAHandler);
      asyncOrthogonalBHandler = postpone(OrthogonalBHandler);
      asyncCompositeHandler = postpone(CompositeHandler);
      asyncGraphHandler = postpone(GraphHandler);
      asyncCompositeTargetHandler = postpone(CompositeTargetHandler);
      asyncGraphTargetHandler = postpone(GraphTargetHandler);
      asyncHandlers = {
        'main': asyncMainHandler.fn,
        'OrthogonalA': asyncOrthogonalAHandler.fn,
        'OrthogonalB': asyncOrthogonalBHandler.fn,
        'Composite': asyncCompositeHandler.fn,
        'Graph': asyncGraphHandler.fn,
        'CompositeTarget': asyncCompositeTargetHandler.fn,
        'GraphTarget': asyncGraphTargetHandler.fn
      };
    });

    it('rejects if an async handler rejects', async () => {
      lock.config({asyncLock: false, asyncUnlock: true, lockError: null, unlockError: null});
      storage.config({asyncGet: false, asyncSet: true, getError: null, setError: null});

      const model = rosmaro({
        graph,
        handlers: asyncHandlers,
        storage: storage,
        lock: lock.fn
      });

      const theError = new Error("an error from the inside");

      const aRes = model.a(1, 2);
      lock.doLock();
      storage.doGet();
      asyncMainHandler.resolve();
      asyncGraphTargetHandler.resolve();
      asyncOrthogonalAHandler.resolve();
      asyncCompositeHandler.reject(theError);
      asyncGraphHandler.resolve();
      asyncCompositeTargetHandler.resolve();
      asyncOrthogonalBHandler.resolve();
      storage.doSet();
      lock.doUnlock();

      let caught;
      try {
        await aRes;
      } catch (error) {
        caught = error;
      }

      assert.strictEqual(caught, theError);

    });

    it('synchronizes calls', async () => {
      lock.config({asyncLock: true, asyncUnlock: true, lockError: null, unlockError: null});
      storage.config({asyncGet: true, asyncSet: true, getError: null, setError: null});

      const model = rosmaro({
        graph,
        handlers: asyncHandlers,
        storage: storage,
        lock: lock.fn
      });

      const aRes = model.a(1, 2);
      lock.doLock();
      storage.doGet();
      asyncMainHandler.resolve();
      asyncGraphTargetHandler.resolve();
      asyncOrthogonalAHandler.resolve();
      asyncCompositeHandler.resolve();
      asyncGraphHandler.resolve();
      asyncCompositeTargetHandler.resolve();
      asyncOrthogonalBHandler.resolve();
      storage.doSet();
      lock.doUnlock();
      await aRes;

      const bRes = model.b(3, 4);
      lock.doLock();
      storage.doGet();
      storage.doSet();
      lock.doUnlock();
      await bRes;

      assert.deepEqual(logEntries, expectedLog);
    });

  });

  describe('with synchronous handlers', () => {


    xit('is fully synchronous if everything is synchronous', () => {
      const model = rosmaro({
        graph,
        handlers: syncHandlers,
        storage: storage,
        lock: lock.fn
      });

      const aRes = model.a(1, 2);
      const bRes = model.b(3, 4);

      assert.deepEqual(expectedRes, aRes);
      assert.deepEqual(logEntries, expectedLog);
    });

    xit('is async if something is async', async () => {
      lock.config({asyncLock: true, asyncUnlock: false, lockError: null, unlockError: null});
      const model = rosmaro({
        graph,
        handlers: syncHandlers,
        storage: storage,
        lock: lock.fn
      });

      const aRes = model.a(1, 2);
      assert(aRes.then);
      lock.doLock();
      const resolvedARes = await aRes;
      const bRes = model.b(3, 4);
      lock.doLock();
      await bRes;

      assert.deepEqual(expectedRes, resolvedARes);
      assert.deepEqual(logEntries, expectedLog);
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