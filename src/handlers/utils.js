export const combineCtxTransformFns = ({first, then}) => ({
  in: ({src, localNodeName}) => {

    const firstIn = first.in({
      src: src, 
      localNodeName
    });

    const thenIn = then.in({
      src: firstIn,
      localNodeName
    });

    return thenIn;
    
  },
  out: ({src, localNodeName, returned}) => {

    const firstIn = first.in({
      src: src, 
      localNodeName
    });

    const thenOut = then.out({
      src: firstIn,
      returned: returned,
      localNodeName
    });

    const firstOut = first.out({
      src: src,
      returned: thenOut,
      localNodeName
    });

    return firstOut;

  }
});

export const transparentCtxTransformFn = {
  in: ({src}) => src,
  out: ({returned}) => returned
};