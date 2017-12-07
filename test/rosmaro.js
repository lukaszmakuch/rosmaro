import assert from 'assert';
import rosmaro from '../src/index';

const syncStorage = () => {
  let data;
  return {
    sync: true,
    get: () => data,
    set: (newData) => data = newData,
    remove: () => data = undefined
  };
};

const dummyLock = () => () => {};

describe('rosmaro', () => {

  describe('sync mode', () => {

    it('handles calls', () => {

      const graph = {
        'main': {
          type: 'graph',
          nodes: {prince: 'prince', frog: 'frog'},
          arrows: {
            'prince': {
              atePizza: {target: 'frog', entryPoint: 'start'}
            }
          },
          entryPoints: {
            start: {target: 'prince', entryPoint: 'start'}
          }
        },
        'prince': {type: 'leaf', parent: 'main'},
        'frog': {type: 'leaf', parent: 'main'}
      };

      const handlers = {

        'prince': ({method, params: [dish], ctx}) => {
          if (method === 'introduce') return {
            res: 'I am The Prince!', 
            ctx
          };
          if (method === 'eat') return {
            ctx,
            arrows: [[[null, dish === 'pizza' ? 'atePizza' : null]]],
            res: "ate " + dish
          };
          return {ctx};

        },

        'frog': ({method, params, ctx}) => {
          if (method === 'introduce') return {res: 'Ribbit!'};
          return {ctx};
        }

      };

      const cursedPrince = rosmaro({
        graph,
        handlers,
        storage: syncStorage(),
        lock: dummyLock
      });

      assert.equal(
        cursedPrince.introduce(),
        'I am The Prince!'
      );
      assert.equal(
        cursedPrince.eat('yakisoba'),
        'ate yakisoba'
      );
      assert.equal(
        cursedPrince.introduce(),
        'I am The Prince!'
      );
      assert.equal(
        cursedPrince.eat('pizza'),
        'ate pizza'
      );
      assert.equal(
        cursedPrince.introduce(),
        'Ribbit!'
      );

    });

  });

});