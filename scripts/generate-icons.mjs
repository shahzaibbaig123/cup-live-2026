/**
 * Generates the app icon set from an inline SVG football motif.
 * Run with: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';

const BG = '#0A0F1A';
const ACCENT = '#3CCB7F';

// Soccer-ball glyph: white circle, black center pentagon, five spokes.
function ball({ cx, cy, r, stroke = r * 0.07 }) {
  const pent = (radius, angleDeg) => {
    const a = (angleDeg * Math.PI) / 180;
    return `${cx + radius * Math.cos(a)},${cy + radius * Math.sin(a)}`;
  };
  const angles = [-90, -18, 54, 126, 198];
  const pentagon = angles.map((a) => pent(r * 0.34, a)).join(' ');
  const spokes = angles
    .map((a) => {
      const [x1, y1] = pent(r * 0.34, a).split(',');
      const [x2, y2] = pent(r * 0.94, a).split(',');
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0A0F1A" stroke-width="${stroke}" stroke-linecap="round"/>`;
    })
    .join('\n');
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF"/>
    <polygon points="${pentagon}" fill="#0A0F1A"/>
    ${spokes}
  `;
}

const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${BG}"/>
  <circle cx="512" cy="512" r="430" fill="none" stroke="${ACCENT}" stroke-width="18" opacity="0.85"/>
  ${ball({ cx: 512, cy: 512, r: 310 })}
</svg>`;

const foregroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${ball({ cx: 512, cy: 512, r: 290 })}
</svg>`;

const backgroundSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${BG}"/>
</svg>`;

const monochromeSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <mask id="holes">
    <rect width="1024" height="1024" fill="black"/>
    <circle cx="512" cy="512" r="290" fill="white"/>
  </mask>
  ${foregroundSvg
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replaceAll('#FFFFFF', 'white')}
</svg>`;

const renders = [
  ['assets/images/icon.png', iconSvg, 1024],
  ['assets/images/android-icon-foreground.png', foregroundSvg, 1024],
  ['assets/images/android-icon-background.png', backgroundSvg, 1024],
  ['assets/images/android-icon-monochrome.png', monochromeSvg, 1024],
  ['assets/images/splash-icon.png', foregroundSvg, 512],
  ['assets/images/favicon.png', iconSvg, 48],
];

for (const [path, svg, size] of renders) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path);
  console.log('wrote', path);
}
