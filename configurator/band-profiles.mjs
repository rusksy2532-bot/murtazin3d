// A section runs from the right end of the bore, over the crown, to the left end.
// All relief belongs to the same outer skin as the band.
export function designedSection(style, width, thickness, angle, character) {
  const half = width / 2;
  const lip = Math.min(0.23, thickness * 0.13, half * 0.14);
  const crownHalf = half - lip;
  const strength = (character - 1) / 4;
  const crest = (0.08 + 0.28 * strength) * Math.sin(2 * angle);
  const points = [];

  function arc(cx, cy, from, to) {
    for (let i = 0; i <= 4; i++) {
      const a = from + (to - from) * i / 4;
      points.push([cx + lip * Math.cos(a), cy + lip * Math.sin(a)]);
    }
  }

  function crown(u) {
    if (style === 'ridge') {
      // A lenticular spine with two broad faces. Its crest wanders around the band.
      const slope = Math.abs(u - crest) / (u > crest ? 1 - crest : 1 + crest);
      const depth = Math.min(thickness * (0.21 + 0.10 * strength), thickness - 0.96);
      return thickness - depth * slope;
    }
    if (style === 'flutes') {
      // Oblique flutes fade into continuous polished margins at the sides.
      const phase = 16 * angle + (0.9 + strength) * u;
      const depth = Math.min(thickness * (0.16 + 0.07 * strength), thickness - 0.96);
      const envelope = (1 - u * u) ** 2;
      return thickness - depth * envelope * (0.5 + 0.5 * Math.cos(phase));
    }
    if (style === 'twin') {
      // Two convex ribbons share a web of metal beneath the shallow valley.
      const depth = Math.min(thickness * (0.18 + 0.09 * strength), thickness - 0.96);
      return thickness - depth * Math.cos(Math.PI * u) ** 2;
    }
    throw new RangeError('Неизвестный рельеф шинки.');
  }

  arc(half - lip, lip, -Math.PI / 2, 0);
  arc(crownHalf, crown(1) - lip, 0, Math.PI / 2);
  if (style === 'ridge') {
    // A short plateau gives the polished spine a visible highlight.
    for (const u of [crest + 0.06, crest - 0.06]) points.push([u * crownHalf, thickness]);
  } else {
    for (let i = 1; i < 32; i++) {
      const u = 1 - i / 16;
      points.push([u * crownHalf, crown(u)]);
    }
  }
  arc(-crownHalf, crown(-1) - lip, Math.PI / 2, Math.PI);
  arc(-half + lip, lip, Math.PI, 1.5 * Math.PI);
  return points;
}
