import {reduce, concat, head, values, view, set, lens} from 'ramda';

export const mergeArrows = arrows => reduce(concat, [], arrows);

export const transparentSingleChildHandler = ({action, context, node, children}) => {
  const childRes = head(values(children))({action});
  return {
    ...childRes,
    arrows: addNodeToArrows(node.id, childRes.arrows),
  };
};

export const initialValueLens = initialValue => lens(
  context => context === undefined ? initialValue : context,
  context => context,
);

// arrows like [ [['a:a:a', 'x']] [['a:a:b', 'x']] ]
// node like 'a:a'
// result like [ [['a:a:a', 'x'], ['a:a', 'x']] [['a:a:b', 'x'], ['a:a', 'x']] ]
export const addNodeToArrows = (node, arrows) => {
  return arrows.map(arrow => node === 'main'
    ? arrow
    : [
      ...arrow,
      [node, arrow[arrow.length - 1][1]]
    ]
  );
};

export const testLens = ({
  lens, 
  zoomInInput, 
  zoomInOutput,
  zoomOutInput,
  zoomOutOutput,
}) => {
  expect(zoomInOutput).toEqual(view(lens, zoomInInput));
  expect(zoomOutOutput).toEqual(set(lens, zoomOutInput, zoomInInput));
};

export const assertIdentityLens = lens => testLens({
  lens, 
  zoomInInput: {a: 123, b: 456}, 
  zoomInOutput: {a: 123, b: 456},
  zoomOutInput: {z: 456, x: 678},
  zoomOutOutput: {z: 456, x: 678},
});
