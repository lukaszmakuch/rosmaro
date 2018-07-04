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

describe('handlers', () => {

  it('always provides a complete list of lenses', () => {
    const {lenses} = makeHandlers({}, mockGraph(['A']));
    assertIdentityLens(lenses.A);
  });

  describe('context lenses', () => {
    it('is a way to transform the context', () => {

      const {handlers, lenses} = makeHandlers({
        node: {

          lens: ({localNodeName}) => Rlens(
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
        Rview(lenses['node']({localNodeName: 'node'}), {text: 'hello'}),
        {text: 'hello node'}
      );
      assert.deepEqual(
        Rset(lenses['node']({localNodeName: 'node'}), {text: 'hi node'}, {}),
        {text: 'hi world'}
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

  describe('leaf', () => {

    it('associates functions with methods', () => {
      const model = {};

      let receivedByA;
      let receivedByB;

      const {handlers, lenses} = makeHandlers({
        node: {
          handler: ({action, ctx}) => {
            switch(action.type) {
              case 'a':
                return {
                  res: {receivedByA: {ctx, action}},
                  ctx,
                  arrows: [[[null, 'aArrow']]],
                };
                break;
              case 'b':
                return {
                  res: {receivedByB: {ctx, action}},
                  ctx: {bCtx: 123},
                  arrows: [[[null, 'bArrow']]],
                };
                break;
              }
            }
          }
        }, 
        mockGraph(['node', 'b'])
      );

      assertIdentityLens(lenses['node']);

      const aRes = handlers['node']({
        ctx: {whole: 'ctx'},
        action: {type: 'a', paramA: 'a', paramB: 'b'},
      });
      assert.deepEqual(
        {
          res: {receivedByA: {
            ctx: {whole: 'ctx'},
            action: {type: 'a', paramA: 'a', paramB: 'b'},
          }},
          ctx: {whole: 'ctx'},
          arrows: [[[null, 'aArrow']]],
        },
        handlers['node']({
          ctx: {whole: 'ctx'},
          action: {type: 'a', paramA: 'a', paramB: 'b'},
        })
      );
      assert.deepEqual(
        {
          res: {receivedByB: {
            ctx: {whole: 'ctx'},
            action: {type: 'b'},
          }},
          ctx: {bCtx: 123},
          arrows: [[[null, 'bArrow']]],
        },
        handlers['node']({
          ctx: {whole: 'ctx'},
          action: {type: 'b'},
        })
      );

    });

  });

});