// Millimetres. Each radial section is one counterclockwise loop in (axial, radial) space.
const TAU = Math.PI * 2;
const STATIONS = 256;

function checkNumber(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${label}: допустимо от ${min} до ${max}.`);
  }
}

function ringSection(style, width, thickness, angle, character, lobes) {
  const wave = style === 'wave';
  const expression = character - 3;
  const drift = 0.12 + 0.03 * expression;
  // The width of the wave is its full axial envelope, including both crests.
  const half = width * (wave ? 0.5 - drift : 0.5);
  const offset = wave ? width * drift * Math.sin(lobes * angle) : 0;
  const lip = Math.min(0.32, thickness * 0.15, half * 0.22);
  const points = [];
  function add(x, y) { points.push([offset + x, y]); }
  function arc(cx, cy, radius, a, b, count) {
    for (let i = 0; i <= count; i++) {
      const t = a + (b - a) * i / count;
      add(cx + radius * Math.cos(t), cy + radius * Math.sin(t));
    }
  }
  // A cylindrical bore with a rounded transition at both sides.
  arc(half - lip, lip, lip, -Math.PI / 2, 0, 5);
  if (style === 'facet') {
    const chamfer = Math.min(half * 0.26, thickness * 0.38) * (1 + 0.2 * expression);
    add(half, thickness - chamfer);
    add(half - chamfer, thickness);
    add(-half + chamfer, thickness);
    add(-half, thickness - chamfer);
  } else {
    const shoulder = thickness * ((wave ? 0.52 : 0.44) - 0.08 * expression);
    const skew = wave ? (0.32 + 0.07 * expression) * Math.cos(lobes * angle) : 0;
    for (let i = 0; i <= 32; i++) {
      const t = Math.PI * i / 32;
      const sin = Math.sin(t);
      // The wave crown rolls from one shoulder to the other. For |skew|<1/2
      // x(t) remains monotone, so the section cannot fold back into itself.
      add(half * (Math.cos(t) + skew * sin * sin),
        shoulder + (thickness - shoulder) * sin);
    }
  }
  arc(-half + lip, lip, lip, Math.PI, Math.PI * 1.5, 5);
  return points;
}

export function buildRing({template, diameter, width, thickness, shrink, character = 3, lobes = 2}) {
  if (!['classic', 'facet', 'wave'].includes(template)) throw new RangeError('Неизвестный профиль.');
  checkNumber(diameter, 14, 23, 'Внутренний диаметр');
  checkNumber(width, 2, 8, 'Ширина');
  checkNumber(thickness, 1.2, 2.8, 'Толщина');
  checkNumber(shrink, 0, 3, 'Линейная усадка');
  if (!Number.isInteger(character) || character < 1 || character > 5) throw new RangeError('Характер профиля: целое число от 1 до 5.');
  if (!Number.isInteger(lobes) || lobes < 1 || lobes > 4) throw new RangeError('Количество волн: целое число от 1 до 4.');
  // Circumscribe the regular polygon around the requested bore gauge.
  const bore = diameter / (2 * Math.cos(Math.PI / STATIONS));
  const section = ringSection(template, width, thickness, 0, character, lobes);
  const stride = section.length;
  const positions = new Float32Array(3 * STATIONS * stride);
  const indices = new Uint32Array(6 * STATIONS * stride);
  let face = 0;
  for (let i = 0; i < STATIONS; i++) {
    const angle = TAU * i / STATIONS;
    const current = template === 'wave' ? ringSection(template, width, thickness, angle, character, lobes) : section;
    const next = (i + 1) % STATIONS;
    for (let j = 0; j < stride; j++) {
      const [axial, radial] = current[j];
      const radius = bore + radial;
      const a = i * stride + j;
      positions.set([radius * Math.cos(angle), radius * Math.sin(angle), axial], 3 * a);
      const k = (j + 1) % stride;
      const b = next * stride + j;
      const c = next * stride + k;
      const d = i * stride + k;
      indices.set([a, d, b, d, c, b], face);
      face += 6;
    }
  }
  let sixVolume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = 3 * indices[i], b = 3 * indices[i + 1], c = 3 * indices[i + 2];
    sixVolume += positions[a] * (positions[b+1]*positions[c+2] - positions[b+2]*positions[c+1])
      + positions[a+1] * (positions[b+2]*positions[c] - positions[b]*positions[c+2])
      + positions[a+2] * (positions[b]*positions[c+1] - positions[b+1]*positions[c]);
  }
  if (!(sixVolume > 0)) throw new Error('Не удалось построить замкнутый объём.');
  return {positions, indices, volume: sixVolume / 6, factor: 1 / (1 - shrink / 100),
    section, triangles: indices.length / 3};
}

export function binarySTL({positions, indices, factor}) {
  const count = indices.length / 3;
  const buffer = new ArrayBuffer(84 + 50 * count);
  new Uint8Array(buffer).set(new TextEncoder().encode('R&R Design | ring configurator | millimetres'));
  const view = new DataView(buffer);
  view.setUint32(80, count, true);
  let offset = 84;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]*3, b = indices[i+1]*3, c = indices[i+2]*3;
    const ux = positions[b]-positions[a], uy = positions[b+1]-positions[a+1], uz = positions[b+2]-positions[a+2];
    const vx = positions[c]-positions[a], vy = positions[c+1]-positions[a+1], vz = positions[c+2]-positions[a+2];
    const nx = uy*vz-uz*vy, ny = uz*vx-ux*vz, nz = ux*vy-uy*vx;
    const length = Math.hypot(nx, ny, nz);
    for (const value of [nx/length, ny/length, nz/length]) {
      view.setFloat32(offset, value, true);
      offset += 4;
    }
    for (const vertex of [a, b, c]) {
      for (let axis = 0; axis < 3; axis++) {
        view.setFloat32(offset, positions[vertex + axis] * factor, true);
        offset += 4;
      }
    }
    offset += 2; // zero attribute count
  }
  return buffer;
}
