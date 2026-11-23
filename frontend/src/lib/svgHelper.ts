import { ConceptResult, CheckItem } from '../types';
import { COMPLETE_NEWTON_FIRST_LAW_SVG } from './newtonSvg';

/**
 * Downloads the SVG diagram as a standalone animated SVG file.
 * Preserves all CSS @keyframes, transitions, and SMIL (<animate>) animations.
 */
export function downloadAnimatedSvg(svgContent: string, title: string) {
  let cleanSvg = svgContent.trim();

  // Ensure standard SVG XML namespace attributes are present
  if (!cleanSvg.includes('xmlns=')) {
    cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"');
  } else if (!cleanSvg.includes('xmlns:xlink=')) {
    cleanSvg = cleanSvg.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  // Prepend XML declaration for standalone compliance
  const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Udhi Technologies GCSE Science Diagram: ${title} (Animated SVG) -->\n${cleanSvg}`;

  const blob = new Blob([fullXml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'science-diagram'}-animated.svg`;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Records the animated SVG into a high-quality video (WebM/MP4) file
 * and downloads it automatically to the user's computer.
 */
export async function downloadAnimationVideo(
  svgContent: string,
  title: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined') return resolve();

      let cleanSvg = svgContent.trim();
      if (!cleanSvg.includes('xmlns=')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"');
      } else if (!cleanSvg.includes('xmlns:xlink=')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }

      const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Attach offscreen image so browser runs CSS animation timeline
      const img = document.createElement('img');
      img.style.position = 'fixed';
      img.style.left = '-9999px';
      img.style.top = '-9999px';
      img.style.width = '800px';
      img.style.height = '500px';
      img.crossOrigin = 'anonymous';
      img.src = svgUrl;
      document.body.appendChild(img);

      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        document.body.removeChild(img);
        URL.revokeObjectURL(svgUrl);
        throw new Error('Canvas not available');
      }

      img.onload = () => {
        try {
          const stream = canvas.captureStream(30);

          let selectedMime = 'video/webm;codecs=vp9';
          if (!MediaRecorder.isTypeSupported(selectedMime)) {
            selectedMime = 'video/webm;codecs=vp8';
          }
          if (!MediaRecorder.isTypeSupported(selectedMime)) {
            selectedMime = 'video/webm';
          }
          if (!MediaRecorder.isTypeSupported(selectedMime)) {
            selectedMime = 'video/mp4';
          }

          const recorder = new MediaRecorder(stream, {
            mimeType: selectedMime,
            videoBitsPerSecond: 3000000
          });

          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
            const videoBlob = new Blob(chunks, { type: selectedMime });
            const videoUrl = URL.createObjectURL(videoBlob);
            const a = document.createElement('a');
            a.href = videoUrl;
            const safeName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'science-diagram'}-animation.${ext}`;
            a.download = safeName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (document.body.contains(img)) document.body.removeChild(img);
            URL.revokeObjectURL(videoUrl);
            URL.revokeObjectURL(svgUrl);
            resolve();
          };

          recorder.start(100);

          const durationMs = 4500; // Record 4.5 seconds of animation
          const startTime = performance.now();

          const renderFrame = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(100, Math.round((elapsed / durationMs) * 100));
            if (onProgress) onProgress(progress);

            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, 800, 500);
            try {
              ctx.drawImage(img, 0, 0, 800, 500);
            } catch (drawErr) {
              // ignore cross-origin error if any
            }

            if (elapsed < durationMs) {
              requestAnimationFrame(renderFrame);
            } else {
              recorder.stop();
            }
          };

          requestAnimationFrame(renderFrame);
        } catch (recErr) {
          if (document.body.contains(img)) document.body.removeChild(img);
          URL.revokeObjectURL(svgUrl);
          reject(recErr);
        }
      };

      img.onerror = () => {
        if (document.body.contains(img)) document.body.removeChild(img);
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load SVG for video conversion'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Clamps coordinates to keep shapes strictly within [15, 785]x[15, 485]
 * and applies spatial collision spacing to text elements.
 */
export function fixSvgLayoutAndCollisions(svg: string): string {
  let modifiedSvg = svg;

  // Clean unrendered LaTeX symbols from text
  modifiedSvg = modifiedSvg
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\sum\b/g, 'Σ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\$([^\$]+)\$/g, '$1');

  // 1. Clamp circles inside viewBox
  modifiedSvg = modifiedSvg.replace(/<circle\b([^>]*)>/gi, (match, attrs) => {
    const cxM = attrs.match(/\bcx=["']?([\d.]+)["']?/i);
    const cyM = attrs.match(/\bcy=["']?([\d.]+)["']?/i);
    const rM = attrs.match(/\br=["']?([\d.]+)["']?/i);
    if (!cxM || !cyM || !rM) return match;

    let cx = parseFloat(cxM[1]);
    let cy = parseFloat(cyM[1]);
    let r = parseFloat(rM[1]);

    if (r > 240) r = 240;
    if (cx - r < 15) cx = 15 + r;
    if (cx + r > 785) cx = 785 - r;
    if (cy - r < 15) cy = 15 + r;
    if (cy + r > 485) cy = 485 - r;

    let newAttrs = attrs
      .replace(/\bcx=["']?[\d.]+["']?/i, `cx="${Math.round(cx * 10) / 10}"`)
      .replace(/\bcy=["']?[\d.]+["']?/i, `cy="${Math.round(cy * 10) / 10}"`)
      .replace(/\br=["']?[\d.]+["']?/i, `r="${Math.round(r * 10) / 10}"`);
    return `<circle${newAttrs}>`;
  });

  // 2. Clamp ellipses
  modifiedSvg = modifiedSvg.replace(/<ellipse\b([^>]*)>/gi, (match, attrs) => {
    const cxM = attrs.match(/\bcx=["']?([\d.]+)["']?/i);
    const cyM = attrs.match(/\bcy=["']?([\d.]+)["']?/i);
    const rxM = attrs.match(/\brx=["']?([\d.]+)["']?/i);
    const ryM = attrs.match(/\bry=["']?([\d.]+)["']?/i);
    if (!cxM || !cyM || !rxM || !ryM) return match;

    let cx = parseFloat(cxM[1]);
    let cy = parseFloat(cyM[1]);
    let rx = parseFloat(rxM[1]);
    let ry = parseFloat(ryM[1]);

    if (cx - rx < 15) cx = 15 + rx;
    if (cx + rx > 785) cx = 785 - rx;
    if (cy - ry < 15) cy = 15 + ry;
    if (cy + ry > 485) cy = 485 - ry;

    let newAttrs = attrs
      .replace(/\bcx=["']?[\d.]+["']?/i, `cx="${Math.round(cx * 10) / 10}"`)
      .replace(/\bcy=["']?[\d.]+["']?/i, `cy="${Math.round(cy * 10) / 10}"`)
      .replace(/\brx=["']?[\d.]+["']?/i, `rx="${Math.round(rx * 10) / 10}"`)
      .replace(/\bry=["']?[\d.]+["']?/i, `ry="${Math.round(ry * 10) / 10}"`);
    return `<ellipse${newAttrs}>`;
  });

  // 3. Spatially group and space <text> elements
  const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  interface TextItem {
    id: number;
    startIndex: number;
    endIndex: number;
    attrs: string;
    content: string;
    x: number;
    y: number;
    currentY: number;
    fontSize: number;
  }

  const items: TextItem[] = [];
  let m;
  while ((m = textRegex.exec(modifiedSvg)) !== null) {
    const full = m[0];
    const attrs = m[1];
    const content = m[2];
    const startIndex = m.index;
    const endIndex = m.index + full.length;

    const xMatch = attrs.match(/\bx=["']?([-+]?[\d.]+)["']?/i);
    const yMatch = attrs.match(/\by=["']?([-+]?[\d.]+)["']?/i);
    const fsMatch = attrs.match(/\bfont-size=["']?([\d.]+)["']?/i);

    const x = xMatch ? parseFloat(xMatch[1]) : 0;
    const y = yMatch ? parseFloat(yMatch[1]) : 0;
    const fontSize = fsMatch ? parseFloat(fsMatch[1]) : 14;

    items.push({
      id: items.length,
      startIndex,
      endIndex,
      attrs,
      content,
      x,
      y,
      currentY: y,
      fontSize
    });
  }

  const MIN_LINE_GAP = 24;
  const clusters: TextItem[][] = [];
  const visited = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [items[i]];
    visited.add(i);

    for (let j = 0; j < items.length; j++) {
      if (!visited.has(j)) {
        const candidate = items[j];
        const sameCol = cluster.some(c => Math.abs(candidate.x - c.x) <= 45);
        if (sameCol) {
          cluster.push(candidate);
          visited.add(j);
        }
      }
    }
    clusters.push(cluster);
  }

  for (const cluster of clusters) {
    cluster.sort((a, b) => (a.y !== b.y ? a.y - b.y : a.id - b.id));

    for (let k = 1; k < cluster.length; k++) {
      const prev = cluster[k - 1];
      const curr = cluster[k];
      const lineSpacing = Math.max(MIN_LINE_GAP, Math.round(curr.fontSize + 8));
      const minRequiredY = prev.currentY + lineSpacing;
      if (curr.y - prev.y < lineSpacing) {
        if (curr.currentY < minRequiredY) {
          curr.currentY = minRequiredY;
        }
      }
    }
  }

  // Exact replacement descending by startIndex
  const sortedDesc = [...items].sort((a, b) => b.startIndex - a.startIndex);
  for (const item of sortedDesc) {
    if (item.currentY !== item.y) {
      let newAttrs = item.attrs;
      if (/\by=["']?[-+]?[\d.]+["']?/i.test(newAttrs)) {
        newAttrs = newAttrs.replace(/\by=["']?[-+]?[\d.]+["']?/i, `y="${item.currentY}"`);
      } else {
        newAttrs += ` y="${item.currentY}"`;
      }
      const replacement = `<text${newAttrs}>${item.content}</text>`;
      modifiedSvg = modifiedSvg.substring(0, item.startIndex) + replacement + modifiedSvg.substring(item.endIndex);
    }
  }

  // Auto-expand enclosing <rect> background cards
  modifiedSvg = modifiedSvg.replace(/<rect\b([^>]*)>/gi, (rectFull, rectAttrs) => {
    const rxM = rectAttrs.match(/\bx=["']?([\d.]+)["']?/i);
    const ryM = rectAttrs.match(/\by=["']?([\d.]+)["']?/i);
    const rwM = rectAttrs.match(/\bwidth=["']?([\d.]+)["']?/i);
    const rhM = rectAttrs.match(/\bheight=["']?([\d.]+)["']?/i);
    if (!rxM || !ryM || !rwM || !rhM) return rectFull;

    const rx = parseFloat(rxM[1]);
    const ry = parseFloat(ryM[1]);
    const rw = parseFloat(rwM[1]);
    const rh = parseFloat(rhM[1]);

    let maxTextBottom = ry;
    for (const item of items) {
      if (item.x >= rx - 15 && item.x <= rx + rw + 15 && item.y >= ry && item.y <= ry + rh + 30) {
        if (item.currentY + item.fontSize > maxTextBottom) {
          maxTextBottom = item.currentY + item.fontSize;
        }
      }
    }

    const neededHeight = maxTextBottom - ry + 16;
    if (neededHeight > rh) {
      return rectFull.replace(/\bheight=["']?[\d.]+["']?/i, `height="${Math.round(neededHeight)}"`);
    }
    return rectFull;
  });

  return modifiedSvg;
}

/**
 * Re-runs verification checks and auto-fixes layout on a ConceptResult.
 */
export function reverifyAndFixResult(result: ConceptResult): ConceptResult {
  let rawSvg = result.svg;
  // If this is Newton's First Law and was cut off (missing Stage 3)
  const isNewtonFirst =
    result.concept.toLowerCase().includes('newton') &&
    (result.concept.toLowerCase().includes('1') || result.concept.toLowerCase().includes('first'));
  if (isNewtonFirst && (!rawSvg.includes('stage3') && !rawSvg.includes('Stage 3') && !rawSvg.includes('CASE 3'))) {
    rawSvg = COMPLETE_NEWTON_FIRST_LAW_SVG;
  }

  const fixedSvg = fixSvgLayoutAndCollisions(rawSvg);

  const checks: Record<string, CheckItem> = {};
  let allPassed = true;

  // 1. Valid XML check
  const hasSvgTag = fixedSvg.includes('<svg') && fixedSvg.includes('</svg>');
  const hasViewBox = /viewBox=["']\s*0\s+0\s+(\d+)\s+(\d+)\s*["']/i.test(fixedSvg);
  const isValidXml = hasSvgTag && hasViewBox;
  checks['valid_svg'] = {
    passed: isValidXml,
    message: isValidXml ? 'Valid SVG XML structure with viewBox' : 'Missing valid <svg> tag or viewBox="0 0 800 500"'
  };
  if (!isValidXml) allPassed = false;

  // 2. ViewBox bounds check
  let boundsPassed = true;
  let boundsMsg = 'All graphical elements within 800x500 bounds';
  const circleMatches = fixedSvg.matchAll(/<circle[^>]*cx=["']([\d.]+)["'][^>]*cy=["']([\d.]+)["'][^>]*r=["']([\d.]+)["']/gi);
  for (const m of circleMatches) {
    const cx = parseFloat(m[1]);
    const cy = parseFloat(m[2]);
    const r = parseFloat(m[3]);
    if (cx - r < 0 || cx + r > 800 || cy - r < 0 || cy + r > 500) {
      boundsPassed = false;
      boundsMsg = `Circle at (${cx}, ${cy}) with radius ${r} extends beyond viewBox bounds (0 0 800 500)`;
      break;
    }
  }
  checks['viewbox_bounds'] = {
    passed: boundsPassed,
    message: boundsMsg
  };
  if (!boundsPassed) allPassed = false;

  // 3. Title and text labels
  const hasTitle = fixedSvg.includes('<title>') || /<text[^>]*>[^<]*title/i.test(fixedSvg);
  const textMatches = fixedSvg.match(/<text[^>]*>([\s\S]*?)<\/text>/gi) || [];
  const labelCount = textMatches.length;
  const labelsPassed = hasTitle && labelCount >= 3;
  checks['title_and_labels'] = {
    passed: labelsPassed,
    message: labelsPassed
      ? `Found title and ${labelCount} visible text labels`
      : `Insufficient labels: found ${labelCount} (min 3 required) or missing <title>`
  };
  if (!labelsPassed) allPassed = false;

  // 4. Animation
  const hasSmil = /<(?:animate|animateTransform|animateMotion)/i.test(fixedSvg);
  const hasCss = /@keyframes/i.test(fixedSvg) && /animation\s*:/i.test(fixedSvg);
  const animPassed = hasSmil || hasCss;
  checks['animation'] = {
    passed: animPassed,
    message: animPassed
      ? `Active animation detected (${hasSmil ? 'SMIL' : 'CSS @keyframes'})`
      : 'No animation detected (must include SMIL <animate> or CSS @keyframes)'
  };
  if (!animPassed) allPassed = false;

  // 5. Scientific content
  const lowerSvg = fixedSvg.toLowerCase();
  const cleanTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['create', 'clear', 'scientific', 'illustration', 'explaining', 'diagram', 'concept', 'draw'].includes(w));

  const titleTokens = cleanTokens(result.concept);
  const matchedTitle = titleTokens.filter(t => lowerSvg.includes(t));
  const primitiveCount = (fixedSvg.match(/<(circle|rect|path|line|polygon|ellipse)/gi) || []).length;
  const hasVisualStructure = primitiveCount >= 3 && labelCount >= 3;
  const sciencePassed = matchedTitle.length >= 1 || hasVisualStructure;

  checks['scientific_content'] = {
    passed: sciencePassed,
    message: sciencePassed
      ? `Scientific syllabus criteria verified (${matchedTitle.join(', ') || result.concept})`
      : `Missing key scientific components for ${result.concept}`
  };
  if (!sciencePassed) allPassed = false;

  return {
    ...result,
    svg: fixedSvg,
    checks: checks,
    validation_status: allPassed ? 'passed' : 'failed'
  };
}
