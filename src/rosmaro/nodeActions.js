// model data like {ctx, instanceID}
// res like [{node, modelData, method}]
export const changedNodesToCall = ({
  leftNodes, 
  enteredNodes, 
  newModelData,
  oldModelData
}) => {
  return [
    ...enteredNodes.map(node => ({
      node,
      modelData: newModelData,
      method: 'onEntry'
    })),
    ...leftNodes.map(node => {
      const alsoEntered = enteredNodes.includes(node);
      return {
        node,
        modelData: alsoEntered ? newModelData : oldModelData,
        method: 'afterLeft'
      };
    })
  ];
};