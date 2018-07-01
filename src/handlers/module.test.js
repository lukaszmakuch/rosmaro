import assert from 'assert';
import makeHandlers from './api';
import invert from 'lodash/invert';
import {view as Rview, set as Rset, lens as Rlens} from 'ramda';

const finalChild = () => ({arrows: [[[null, null]]], ctx: {type: 'finalChildCtx'}, res: undefined});

const assertIdentityLens = lensFactory => {
  const lens = lensFactory();
  const ctx = {a: 123, b: 456};
  assert.deepEqual(
    ctx,
    Rview(lens, ctx)
  );
  assert.deepEqual(
    ctx,
    Rset(lens, ctx, ctx)
  );
}

// All we need to build handlers is to read the list of all nodes.
const mockGraph = nodes => invert(nodes);

describe('handler', () => {
  it('groups handles, lenses and nodes', () => {

    const MyNodeHandler = () => ({});
    const MyNodeLens = {};
    const MyNodeNodes = () => [];

    const input = {
      MyNode: {
        handler: MyNodeHandler,
        lens: MyNodeLens,
        nodes: MyNodeNodes,
      }
    };

    const output = makeHandlers(input, mockGraph(['MyNode', 'EmptyNode']));

    // These are just rewritten.
    assert.deepEqual(output.handlers['MyNode'], MyNodeHandler);
    assert.deepEqual(output.lenses['MyNode'], MyNodeLens);
    assert.deepEqual(output.nodes['MyNode'], MyNodeNodes);

    // These are transparent, automatically generated ones,
    // because the user didn't provided anything for the EmptyNode.
    assertIdentityLens(output.lenses['EmptyNode']);
    assert.deepEqual(output.nodes['EmptyNode'](), []);
    assert.deepEqual(output.handlers['EmptyNode']({
      method: 'x', 
      ctx: {init: 123}, 
      params: [], 
      child: finalChild
    }), {
      res: undefined,
      ctx: {type: 'finalChildCtx'},
      arrows: [[[null, null]]]
    });

  });
});

xdescribe('handlers', () => {

  it('always provides a complete list of lenses', () => {
    const {lenses} = makeHandlers({}, mockGraph(['A']));
    assertIdentityLens(lenses.A);
  });

  describe('context lenses', () => {
    it('is a way to transform the context', () => {

      const {handlers, lenses} = makeHandlers({
        node: {

          ctxLens: ({localNodeName}) => Rlens(
            ctx => ({
              text: ctx.text + " " + localNodeName
            }),
            (returned, src) => ({
              ...src,
              text: returned.text.replace(localNodeName, "world")
            })
          )

        }
      }, mockGraph(['node']));

      assert.deepEqual(
        Rview(lenses.node({localNodeName: 'node'}), {}),
        {text: 'hello node'}
      );
      assert.deepEqual(
        Rset(lenses.node({localNodeName: 'node'}), {text: 'hi node'}, {}),
        {
          sub: {
            another: 123,
            text: 'hi world'
          }
        }
      );

    });
  });

  describe('dynamic nodes', () => {

    it('returns an empty list by default', () => {
      const {nodes} = makeHandlers({
        dynamic: {
        }
      }, mockGraph(['dynamic']));

      assert.deepEqual([], nodes.dynamic());
    });

    it('returns the provided function if any', () => {
      const nodesFn = ({ctx}) => ctx.elems;

      const {nodes} = makeHandlers({
        dynamic: {
          nodes: nodesFn
        }
      }, mockGraph(['dynamic']));

      const elems = ['a', 'b', 'c'];
      const ctx = {elems};

      assert.deepEqual(elems, nodes.dynamic({ctx}));
    });

  });

  describe('alter result', () => {
    it('allows to alter the result of a method call', () => {

      const {handlers, lenses} = makeHandlers({
        node: {
          method: () => 'result',
          afterMethod: ({res}) => 'altered ' + res
        }
      }, mockGraph(['node']));

      assertIdentityLens(lenses.node);

      assert.deepEqual(handlers.node({
        method: 'method',
        node: {},
        params: [],
        ctx: {},
      }), {
        res: 'altered result',
        arrows: [[[null, null]]],
        ctx: {}
      });

    });
  });

  describe('leaf', () => {

    it('associates functions with methods', () => {
      const model = {};

      let receivedByA;
      let receivedByB;

      const {handlers, lenses} = makeHandlers({
        node: {
          a({ctx, paramA, paramB, thisModel}) {
            receivedByA = {ctx, paramA, paramB, thisModel};
            return {
              res: 'aRes',
              ctx: {aCtx: 123},
              arrow: 'aArrow'
            };
          },

          b: ({ctx, param, thisModel}) => {
            receivedByB = {ctx, thisModel};
            return {
              res: 'bRes',
              ctx: {bCtx: 123},
              arrow: 'bArrow'
            };
          }
        }
      }, mockGraph(['node', 'b']));

      assertIdentityLens(lenses.node);

      const aRes = handlers.node({
        ctx: {whole: 'ctx'},
        method: 'a',
        params: [{paramA: 'a', paramB: 'b'}],
        model
      });
      const bRes = handlers.node({
        ctx: {whole: 'ctx'},
        method: 'b',
        params: [],
        model
      });

      assert.deepEqual(receivedByA, {
        ctx: {whole: 'ctx'},
        paramA: 'a',
        paramB: 'b',
        thisModel: model
      });
      assert.deepEqual(aRes, {
        arrows: [[[null, 'aArrow']]],
        ctx: {aCtx: 123},
        res: 'aRes'
      });

      assert.deepEqual(receivedByB, {
        ctx: {whole: 'ctx'},
        thisModel: model
      });
      assert.deepEqual(bRes, {
        arrows: [[[null, 'bArrow']]],
        ctx: {bCtx: 123},
        res: 'bRes'
      });

    });

    it('does nothing when a method is not found', () => {
      const {handlers, lenses} = makeHandlers({
        otherNode: {
          a: () => ({res: 'aRes', arrow: 'x', ctx: {x: 987}})
        }
      }, mockGraph(['a']));
      assertIdentityLens(lenses.otherNode);
      assert.deepEqual(handlers.otherNode({
        method: 'x', 
        ctx: {init: 123}, 
        params: [], 
        child: finalChild
      }), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just a result', () => {
      const {handlers, lenses} = makeHandlers({
        node: {
          a: () => 'just this'
        }
      }, mockGraph(['node']));
      assertIdentityLens(lenses.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: 'just this',
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return nothing', () => {
      const {handlers, lenses} = makeHandlers({
        node: {
          a: () => {}
        }
      }, mockGraph(['node']));
      assertIdentityLens(lenses.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, null]]]
      });
    });

    it('may return just an arrow', () => {
      const {handlers, lenses} = makeHandlers({
        node: {a: () => ({arrow: 'x'})}
      }, mockGraph(['node']));
      assertIdentityLens(lenses.node);
      assert.deepEqual(handlers.node({method: 'a', ctx: {init: 123}, params: []}), {
        res: undefined,
        ctx: {init: 123},
        arrows: [[[null, 'x']]]
      });
    });

  });

});