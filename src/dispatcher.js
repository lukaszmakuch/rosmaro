import {prefixNode, getSubGraph} from './utils';

const mergeCtxs = (ctx1, ctx2) => ({
  ...ctx1,
  ...ctx2
});

const extractBound = (allBound, desiredRoot) =>
  Object.keys(allBound).reduce((extracted, node) => {
    if (!node.startsWith(desiredRoot)) return extracted;

    // +1 for the ":" mark
    const extractedNode = node.substr(desiredRoot.length + 1);
    const binding = allBound[node];
    return {
      ...extracted, 
      [extractedNode]: binding
    };
  }, {});

// arrows like [ [[CBA, x], [CB, y], [C, z]], ... ]
// res like [ [[XCBA, x], [XCB, y], [XC, z]], ... ]
const prefixArrows = (prefix, arrows) => arrows.map(arrow => arrow.map(
  version => [prefixNode(prefix, version[0]), version[1]]
));

// arrows like [ [[CBA, x], [CB, y], [C, z]], ... ]
// res like [ [[CBA, x], [CB, y], [C, z], ['', z]], ... ]
const addMissingHighestArrow = arrows => arrows.map(arrow => {
  const highest = arrow[arrow.length - 1];
  const highestMissing = highest[0] != '';
  return highestMissing
    ? [...arrow, ['', highest[1]]]
    : arrow;
});

const dispatch = ({
  graph, 
  FSMState, 
  bindings, 
  ctx, 
  method, 
  params
}) => {
  const binding = bindings[''];
  const nodeType = graph.type;
  return ({

    'leaf': () => {
      const leafRes = binding({method, ctx, params});
      return {
        arrows: [[['', leafRes.arrow]]],
        ctx: leafRes.ctx,
        res: leafRes.res
      }
    },

    'composite': () => {
      const composedNodes = Object.keys(graph.nodes);

      const childFn = ({method, ctx, params}) => {
        return composedNodes.reduce((soFar, childNode) => {
          const rawChildRes = dispatch({
            graph: getSubGraph(graph, childNode),
            FSMState: extractBound(FSMState, childNode),
            bindings: extractBound(bindings, childNode),
            ctx,
            method,
            params
          });
          const childRes = {
            ...rawChildRes,
            arrows: prefixArrows(childNode, rawChildRes.arrows)
          };

          return {
            arrows: [...soFar.arrows, ...childRes.arrows],
            ctx: mergeCtxs(soFar.ctx, childRes.ctx),
            res: {...soFar.res, [childNode]: childRes.res}
          };
        }, {arrows: [], ctx: {}, res: undefined});
      };

      const childRes = binding({method, ctx, params, child: childFn});

      return {
        ...childRes,
        arrows: addMissingHighestArrow(childRes.arrows)
      };
    },

    'graph': () => {
      const activeChild = FSMState[''];
      const childFn = ({method, ctx, params}) => {
        const childRes = dispatch({
          graph: getSubGraph(graph, activeChild),
          FSMState: extractBound(FSMState, activeChild),
          bindings: extractBound(bindings, activeChild),
          ctx,
          method,
          params
        });
        return {
          ...childRes,
          arrows: prefixArrows(activeChild, childRes.arrows)
        };
      }

      const childRes = binding({method, ctx, params, child: childFn});
      return {
        ...childRes,
        arrows: addMissingHighestArrow(childRes.arrows)
      };
    },
  })[nodeType]();
};

export default dispatch;