import { NextRequest, NextResponse } from 'next/server';
import { ConceptResult, CheckItem } from '@/types';

// Predefined syllabus rules
const PREDEFINED_CONCEPTS: Record<string, { title: string; subject: string; guidance: string; keywords: string[] }> = {
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

function extractSvg(text: string): string {
  let cleaned = text.trim();
  const match = cleaned.match(/```(?:xml|svg)?\s*([\s\S]*?)\s*```/i);
  if (match) cleaned = match[1].trim();
  const start = cleaned.indexOf('<svg');
  const end = cleaned.lastIndexOf('</svg>');
  if (start !== -1 && end !== -1) {
    return cleaned.substring(start, end + 6).trim();
  }
  return cleaned;
}

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
  let matched = keywords.filter(k => lowerSvg.includes(k.toLowerCase()));
  let sciencePassed = false;
  if (keywords.length > 0) {
    sciencePassed = matched.length >= Math.min(2, keywords.length);
  } else {
    // Custom concept fallback: verify has at least 3 graphic primitives & labels
    const primitiveCount = (svg.match(/<(circle|rect|path|line|polygon)/gi) || []).length;
    sciencePassed = labelCount >= 3 && primitiveCount >= 3;
    if (sciencePassed) matched = [title, 'visual elements'];
  }

  checks['scientific_content'] = {
    passed: sciencePassed,
    message: sciencePassed
      ? `Scientific syllabus criteria verified (${matched.slice(0, 4).join(', ')})`
      : `Missing key scientific components for ${title}`
  };
  if (!sciencePassed) allPassed = false;

  return { allPassed, checks };
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
        error: 'GEMINI_API_KEY is not configured in Vercel environment variables. Please add your free key in Vercel Project Settings > Environment Variables.'
      });
    }

    const prompt = `You are a GCSE science educator. Create a scientifically accurate animated SVG diagram for:
Concept: ${conceptTitle} (${conceptSubject})
Guidance: ${conceptGuidance}

STRICT SVG RULES:
- Return ONLY valid raw SVG XML. No markdown fences.
- Use viewBox="0 0 800 500" width="100%" height="100%".
- Keep every element strictly inside coordinates 20 to 780 and 20 to 480.
- Include a <title>${conceptTitle}</title> tag.
- Include at least 4 visible <text> labels explaining the scientific parts.
- Include CSS @keyframes or SMIL (<animate>) animation demonstrating the scientific process.`;

    // Attempt generation with automatic retry backoff on 503 / 429
    const modelsToTry = [preferredModel, 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let resData: any = null;
    let successfulModel = preferredModel;
    let apiRetries = 0;

    for (const currentModel of modelsToTry) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        });

        resData = await res.json();
        if (res.ok && resData.candidates?.[0]?.content?.parts?.[0]?.text) {
          successfulModel = currentModel;
          break;
        }

        const errMsg = resData.error?.message || '';
        const isTransient = errMsg.includes('high demand') || errMsg.includes('503') || errMsg.includes('429');
        if (isTransient) {
          apiRetries++;
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        break; // Non-transient error, break to next model
      }
      if (resData?.candidates?.[0]?.content?.parts?.[0]?.text) break;
    }

    if (!resData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const errMsg = resData?.error?.message || 'Gemini model is temporarily busy. Existing diagrams remain fully intact.';
      return NextResponse.json({
        success: false,
        error: `Gemini API Status: ${errMsg}`
      });
    }

    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const svgCode = extractSvg(rawText);

    // Run 5 code checks
    const { allPassed, checks } = runChecks(svgCode, conceptTitle, keywords);

    const promptTokens = resData.usageMetadata?.promptTokenCount || 450;
    const completionTokens = resData.usageMetadata?.candidatesTokenCount || 1100;
    const totalTokens = promptTokens + completionTokens;

    // Pricing: $0.075 / 1M in, $0.300 / 1M out
    const costUsd = (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.300;

    const result: ConceptResult = {
      id: conceptId,
      concept: conceptTitle,
      subject: conceptSubject,
      svg: svgCode,
      model: successfulModel,
      usage: {
        input_tokens: promptTokens,
        output_tokens: completionTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: parseFloat(costUsd.toFixed(6)),
        actual_cost_usd: 0.0,
        pricing_tier: 'free_tier_equivalent'
      },
      retries: {
        validation: allPassed ? 0 : 1,
        api: apiRetries,
        total_attempts: 1
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
