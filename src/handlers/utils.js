export const combineCtxTransformFns = ({first, then}) => ({
  in: ({src, localNodeName}) => {
    const firstRes = first.in({
      src: src, 
      localNodeName
    });
    return then.in({
      src: firstRes,
      localNodeName
    });
  },
  out: ({src, localNodeName, returned}) => {
    const firstRes = first.out({
      src: src, 
      localNodeName,
      returned
    });
    return then.out({
      src: returned, 
      localNodeName,
      returned: firstRes
    });
  }
});

export const transparentCtxTransformFn = {
  in: ({src}) => src,
  out: ({returned}) => returned
};