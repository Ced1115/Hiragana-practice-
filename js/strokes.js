// ══════════════════════════════════════════════════════════════════
//  STROKE ORDER — fetches real KanjiVG stroke data and renders it
//  as a colored, numbered SVG diagram.
// ══════════════════════════════════════════════════════════════════

// Unicode codepoint → 5-digit hex filename for KanjiVG
function toKvgName(char) {
  return char.codePointAt(0).toString(16).padStart(5, '0');
}

const STROKE_COLORS = ['#c0392b','#2471a3','#1e8449','#884ea0','#d35400','#148f77','#7d6608'];
const svgCache = {};

async function fetchStrokeSvg(char) {
  if (svgCache[char]) return svgCache[char];
  const code = toKvgName(char);
  const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${code}.svg`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('not found');
  const text = await resp.text();
  svgCache[char] = text;
  return text;
}

function buildColoredSvg(rawSvg) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, 'image/svg+xml');

  // Collect only StrokePaths (not StrokeNumbers)
  const strokePathsGroup = doc.querySelector('[id^="kvg:StrokePaths"]');
  if (!strokePathsGroup) return null;

  // All <path> elements in document order = stroke order
  const paths = Array.from(strokePathsGroup.querySelectorAll('path'));

  // Build a new clean SVG
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 109 109');
  svg.setAttribute('width', '120');
  svg.setAttribute('height', '120');
  svg.setAttribute('xmlns', ns);
  svg.style.display = 'block';

  // Light guide lines (crosshair)
  const makeGuide = (x1,y1,x2,y2) => {
    const l = document.createElementNS(ns,'line');
    l.setAttribute('x1',x1); l.setAttribute('y1',y1);
    l.setAttribute('x2',x2); l.setAttribute('y2',y2);
    l.setAttribute('stroke','#e0d8cc'); l.setAttribute('stroke-width','0.5');
    return l;
  };
  svg.appendChild(makeGuide(54.5,0,54.5,109));
  svg.appendChild(makeGuide(0,54.5,109,54.5));

  // Draw each stroke colored, with a number at the start
  paths.forEach((p, i) => {
    const color = STROKE_COLORS[i % STROKE_COLORS.length];
    const d = p.getAttribute('d');

    // Draw the stroke path
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '3.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    // Find start point of this stroke (M or m command)
    const mMatch = d.match(/^M\s*([\d.]+)[,\s]+([\d.]+)/i);
    if (mMatch) {
      const sx = parseFloat(mMatch[1]);
      const sy = parseFloat(mMatch[2]);

      // White circle bg
      const circ = document.createElementNS(ns, 'circle');
      circ.setAttribute('cx', sx); circ.setAttribute('cy', sy); circ.setAttribute('r', '6');
      circ.setAttribute('fill', '#fff');
      circ.setAttribute('stroke', color); circ.setAttribute('stroke-width', '1.5');
      svg.appendChild(circ);

      // Number
      const txt = document.createElementNS(ns, 'text');
      txt.setAttribute('x', sx); txt.setAttribute('y', sy);
      txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('font-size', '6'); txt.setAttribute('font-family', 'Inter, sans-serif');
      txt.setAttribute('font-weight', 'bold'); txt.setAttribute('fill', color);
      txt.textContent = i + 1;
      svg.appendChild(txt);
    }
  });

  return svg;
}
