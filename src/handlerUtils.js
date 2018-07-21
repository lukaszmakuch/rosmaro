import {reduce, concat, head, values} from 'ramda';

export const mergeArrows = arrows => reduce(concat, [], arrows);

export const transparentSingleChildHandler = ({action, context, node, children}) => {
  const childRes = head(values(children))({action});
  return {
    ...childRes,
    arrows: addNodeToArrows(node.id, childRes.arrows),
  };
};

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
}

