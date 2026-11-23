import { NextRequest, NextResponse } from 'next/server';
import { ConceptResult, CheckItem } from '@/types';

// Predefined syllabus rules
const PREDEFINED_CONCEPTS: Record<string, { title: string; subject: string; guidance: string; keywords: string[] }> = {
  newton1: {
    title: "Newton's first law",
    subject: "Physics",
    guidance: "Draw 3 distinct side-by-side stages: Stage 1 Object At Rest (balanced vertical forces R=W, F_net=0, v=0), Stage 2 Constant Velocity (frictionless track, F_net=0, a=0, v=const), Stage 3 Unbalanced Force (barrier collision, F_net!=0, inertia of unrestrained mass). Use clear arrows for forces and motion.",
    keywords: ["inertia", "resultant", "velocity", "rest", "balanced", "force"]
  },
  pythagoras: {
    title: "Pythagoras' theorem",
    subject: "Maths",
    guidance: "Draw a right-angled triangle in the center with sides a, b, and hypotenuse c. Include a square right angle marker, squares on sides or formula a² + b² = c², and animate the area relationship.",
    keywords: ["hypotenuse", "a²", "b²", "c²"]
  },
  circle: {
    title: "Parts of a circle",
    subject: "Maths",
    guidance: "Draw a circle at (400, 250) radius 140. Label Centre (O), Radius (r), Diameter (d = 2r), and Circumference (C = 2πr). Animate the circumference perimeter tracing.",
    keywords: ["centre", "radius", "diameter", "circumference"]
  },
  circuit: {
    title: "Series circuit",
    subject: "Physics",
    guidance: "Draw a single rectangular wire loop connecting a cell/battery and two components (lamps) in series. Label cell, lamp 1, lamp 2, and animate moving dots showing current flow.",
    keywords: ["cell", "loop", "current", "voltage"]
  },
  photosynthesis: {
    title: "Photosynthesis",
    subject: "Biology",
    guidance: "Draw a green plant leaf in center with vein structure. Draw sun with light rays, inputs CO2 and H2O, outputs glucose and O2, and animate rays or arrows.",
    keywords: ["light", "carbon dioxide", "water", "glucose", "oxygen"]
  },
  matter: {
    title: "States of matter",
    subject: "Chemistry",
    guidance: "Draw 3 containers: Solid (16 touching particles in grid vibrating), Liquid (particles close moving past each other), Gas (particles far apart moving fast). Animate particle movement.",
    keywords: ["solid", "liquid", "gas"]
  }
};

/**
 * Extracts raw SVG string from model output.
 */
function extractSvg(text: string): string {
  let cleaned = text.trim();
  const match = cleaned.match(/```(?:xml|svg)?\s*([\s\S]*?)\s*```/i);
  if (match) cleaned = match[1].trim();
  const start = cleaned.indexOf('<svg');
  const end = cleaned.lastIndexOf('</svg>');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 6).trim();
  }
  return fixSvgLayoutAndCollisions(cleaned);
}

/**
 * Advanced layout & collision engine for generated SVGs:
 * 1. Groups <text> elements by column / card
 * 2. Enforces non-overlapping, strictly incremental Y coordinates (>= 24px gap)
 * 3. Automatically expands enclosing <rect> cards so text never bleeds outside
 * 4. Clamps all graphical shapes (circles, ellipses, rects) inside [15, 785]x[15, 485]
 */
function fixSvgLayoutAndCollisions(svg: string): string {
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

  // 1. Clamp circles within viewBox (0 0 800 500)
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

  // 2. Parse all <text> elements
  const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  interface TextItem {
    id: number;
    startIndex: number;
    endIndex: number;
    full: string;
    attrs: string;
    content: string;
    x: number;
    y: number;
    currentY: number;
    fontSize: number;
    plainText: string;
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
    const plainText = content.replace(/<[^>]+>/g, '').trim();

    items.push({
      id: items.length,
      startIndex,
      endIndex,
      full,
      attrs,
      content,
      x,
      y,
      currentY: y,
      fontSize,
      plainText
    });
  }

  const MIN_LINE_GAP = 24;

  // Group items that share similar X coordinates (same column / card / box)
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

  // In each cluster, sort by original y (and document order)
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

  // Exact replacement descending by startIndex so index positions never shift
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

  // Auto-expand enclosing <rect> background cards if text extended downwards
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
 * 5 independent verification checks.
 */
function runChecks(svg: string, title: string, keywords: string[]): { allPassed: boolean; checks: Record<string, CheckItem> } {
  const checks: Record<string, CheckItem> = {};
  let allPassed = true;

  // 1. Valid SVG XML check
  const hasSvgTag = svg.includes('<svg') && svg.includes('</svg>');
  const hasViewBox = /viewBox=["']\s*0\s+0\s+(\d+)\s+(\d+)\s*["']/i.test(svg);
  const isValidXml = hasSvgTag && hasViewBox;
  checks['valid_svg'] = {
    passed: isValidXml,
    message: isValidXml ? 'Valid SVG XML structure with viewBox' : 'Missing valid <svg> tag or viewBox="0 0 800 500"'
  };
  if (!isValidXml) allPassed = false;

  // 2. ViewBox Bounds check
  let boundsPassed = true;
  let boundsMsg = 'All graphical elements within 800x500 bounds';
  const circleMatches = svg.matchAll(/<circle[^>]*cx=["']([\d.]+)["'][^>]*cy=["']([\d.]+)["'][^>]*r=["']([\d.]+)["']/gi);
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

  // 3. Title and text labels (at least 3 labels)
  const hasTitle = svg.includes('<title>') || /<text[^>]*>[^<]*title/i.test(svg);
  const textMatches = svg.match(/<text[^>]*>([\s\S]*?)<\/text>/gi) || [];
  const labelCount = textMatches.length;
  const labelsPassed = hasTitle && labelCount >= 3;
  checks['title_and_labels'] = {
    passed: labelsPassed,
    message: labelsPassed
      ? `Found title and ${labelCount} visible text labels`
      : `Insufficient labels: found ${labelCount} (min 3 required) or missing <title>`
  };
  if (!labelsPassed) allPassed = false;

  // 4. Animation check
  const hasSmil = /<(?:animate|animateTransform|animateMotion)/i.test(svg);
  const hasCss = /@keyframes/i.test(svg) && /animation\s*:/i.test(svg);
  const animPassed = hasSmil || hasCss;
  checks['animation'] = {
    passed: animPassed,
    message: animPassed
      ? `Active animation detected (${hasSmil ? 'SMIL' : 'CSS @keyframes'})`
      : 'No animation detected (must include SMIL <animate> or CSS @keyframes)'
  };
  if (!animPassed) allPassed = false;

  // 5. Scientific content check
  const lowerSvg = svg.toLowerCase();
  const cleanTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['create', 'clear', 'scientific', 'illustration', 'explaining', 'diagram', 'concept', 'draw'].includes(w));

  const subjectKeywords = keywords && keywords.length > 0 ? keywords : cleanTokens(title);
  const matched = subjectKeywords.filter(k => lowerSvg.includes(k.toLowerCase()));
  const titleTokens = cleanTokens(title);
  const matchedTitle = titleTokens.filter(t => lowerSvg.includes(t));
  const primitiveCount = (svg.match(/<(circle|rect|path|line|polygon|ellipse)/gi) || []).length;
  const hasVisualStructure = primitiveCount >= 3 && labelCount >= 3;
  const sciencePassed = (matched.length >= 1 || matchedTitle.length >= 1) && hasVisualStructure;

  const matchedKeywordsList = [...new Set([...matched, ...matchedTitle])].slice(0, 4);
  checks['scientific_content'] = {
    passed: sciencePassed,
    message: sciencePassed
      ? `Scientific syllabus criteria verified (${matchedKeywordsList.join(', ') || title})`
      : `Missing key scientific components for ${title}`
  };
  if (!sciencePassed) allPassed = false;

  return { allPassed, checks };
}

async function callGeminiWithPrompt(
  prompt: string,
  apiKey: string,
  preferredModel: string
): Promise<{ text: string; model: string; promptTokens: number; completionTokens: number; apiRetries: number; error?: string }> {
  const modelsToTry = [preferredModel, 'gemini-3.5-flash', 'gemini-flash-lite-latest'];
  let apiRetries = 0;
  let lastError = '';

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.25 }
          })
        });

        const resData = await res.json();
        if (res.ok && resData.candidates?.[0]?.content?.parts?.[0]?.text) {
          const promptTokens = resData.usageMetadata?.promptTokenCount || 450;
          const completionTokens = resData.usageMetadata?.candidatesTokenCount || 1100;
          return {
            text: resData.candidates[0].content.parts[0].text,
            model: currentModel,
            promptTokens,
            completionTokens,
            apiRetries
          };
        }

        const errMsg = resData.error?.message || `HTTP ${res.status}`;
        lastError = errMsg;
        const isTransient = errMsg.includes('high demand') || errMsg.includes('503') || errMsg.includes('429');
        if (isTransient) {
          apiRetries++;
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        break; // Non-transient error, try next model
      } catch (err: any) {
        lastError = err.message;
        apiRetries++;
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  return {
    text: '',
    model: preferredModel,
    promptTokens: 0,
    completionTokens: 0,
    apiRetries,
    error: lastError || 'Gemini service is temporarily busy.'
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isCustom = Boolean(body.is_custom);
    let conceptId = body.concept_id || 'pythagoras';
    let conceptTitle = '';
    let conceptSubject = 'Science';
    let conceptGuidance = '';
    let keywords: string[] = [];

    if (isCustom && body.custom_name) {
      conceptTitle = body.custom_name;
      conceptSubject = body.custom_subject || 'Physics';
      conceptGuidance = body.custom_description || `Create a clear scientific illustration explaining ${conceptTitle}.`;
      conceptId = body.concept_id || `custom_${conceptTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      keywords = conceptGuidance.split(/\s+/).filter(w => w.length > 4).slice(0, 5);
    } else {
      const predefined = PREDEFINED_CONCEPTS[conceptId] || PREDEFINED_CONCEPTS['pythagoras'];
      conceptTitle = predefined.title;
      conceptSubject = predefined.subject;
      conceptGuidance = predefined.guidance;
      keywords = predefined.keywords;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY is not configured in environment variables. Please set it in Vercel Project Settings.'
      });
    }

    const basePrompt = `You are an elite GCSE science educator and technical SVG illustrator.
Create a scientifically accurate animated SVG diagram for:
Concept: ${conceptTitle} (${conceptSubject})
Guidance: ${conceptGuidance}

STRICT TECHNICAL & VISUAL RULES:
- Return ONLY valid raw SVG XML. No markdown fences or commentary.
- Use viewBox="0 0 800 500" width="100%" height="100%".
- Keep every element strictly inside coordinates 20 to 780 and 20 to 480.
- Include a <title>${conceptTitle}</title> tag as first child.
- Include at least 4 visible <text> labels with font-size="13" to "18" explaining the science.
- Include CSS @keyframes or SMIL (<animate>) animation demonstrating the scientific mechanism.

CRITICAL ANTI-COLLISION & TYPOGRAPHY RULES:
- NEVER stack or overlap two <text> elements at identical or close Y coordinates.
- Maintain at least 26px vertical distance between different text labels (e.g. Line 1: y="160", Line 2: y="186", Line 3: y="212").
- When putting text inside boxes (e.g. Action Force / Reaction Force / Key Principle cards), make the rect box height >= 80px and width >= 250px so text has clean padding and never collides or bleeds outside the box.
- Do NOT repeat overlapping text on top of other text.`;

    // Attempt 1: Initial generation
    const firstCall = await callGeminiWithPrompt(basePrompt, apiKey, preferredModel);
    if (!firstCall.text) {
      return NextResponse.json({
        success: false,
        error: `Gemini API Status: ${firstCall.error || 'High demand. Please retry shortly.'}`
      });
    }

    let successfulModel = firstCall.model;
    let totalPromptTokens = firstCall.promptTokens;
    let totalCompletionTokens = firstCall.completionTokens;
    let totalApiRetries = firstCall.apiRetries;
    let validationRetries = 0;

    let svgCode = extractSvg(firstCall.text);
    let { allPassed, checks } = runChecks(svgCode, conceptTitle, keywords);

    // Requirement 4: If a check fails, retry once and tell the model why it failed
    if (!allPassed) {
      validationRetries = 1;
      const failureList = Object.entries(checks)
        .filter(([_, c]) => !c.passed)
        .map(([k, c]) => `- ${k}: ${c.message}`)
        .join('\n');

      const retryPrompt = `${basePrompt}

CRITICAL: Your previous SVG generation failed automated validation checks with these errors:
${failureList}

You MUST resolve all of the above issues:
- Ensure all coordinates strictly lie within [20, 780] and [20, 480].
- Ensure all text labels have distinct, non-overlapping Y coordinates with at least 26px line gap.
- Ensure at least 3 visible <text> elements exist with meaningful scientific content.
- Ensure animation is included.
Return ONLY valid raw SVG XML.`;

      const secondCall = await callGeminiWithPrompt(retryPrompt, apiKey, successfulModel);
      if (secondCall.text) {
        successfulModel = secondCall.model;
        totalPromptTokens += secondCall.promptTokens;
        totalCompletionTokens += secondCall.completionTokens;
        totalApiRetries += secondCall.apiRetries;

        const secondSvg = extractSvg(secondCall.text);
        const secondChecks = runChecks(secondSvg, conceptTitle, keywords);

        // If the retry passed or improved, adopt the second result
        if (secondChecks.allPassed || Object.values(secondChecks.checks).filter(c => c.passed).length >= Object.values(checks).filter(c => c.passed).length) {
          svgCode = secondSvg;
          checks = secondChecks.checks;
          allPassed = secondChecks.allPassed;
        }
      }
    }

    const totalTokens = totalPromptTokens + totalCompletionTokens;
    // Pricing: $0.075 / 1M in, $0.300 / 1M out
    const costUsd = (totalPromptTokens / 1_000_000) * 0.075 + (totalCompletionTokens / 1_000_000) * 0.300;

    const result: ConceptResult = {
      id: conceptId,
      concept: conceptTitle,
      subject: conceptSubject,
      svg: svgCode,
      model: successfulModel,
      usage: {
        input_tokens: totalPromptTokens,
        output_tokens: totalCompletionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: parseFloat(costUsd.toFixed(6)),
        actual_cost_usd: 0.0,
        pricing_tier: 'free_tier_equivalent'
      },
      retries: {
        validation: validationRetries,
        api: totalApiRetries,
        total_attempts: validationRetries + 1
      },
      checks: checks,
      generation_status: 'completed',
      validation_status: allPassed ? 'passed' : 'failed',
      review_status: 'pending',
      review_note: ''
    };

    return NextResponse.json({
      success: true,
      result: result
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Server error during generation: ${err.message}`
    });
  }
}
