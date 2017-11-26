export const mapArrows = (map, arrows) => arrows.map(arrow => {
  const highest = arrow[arrow.length - 1];
  const newArrow = map[highest[1]];
  return newArrow
    ? [...arrow, ['', newArrow]]
    : arrow;
});