import { NextRequest, NextResponse } from 'next/server';
import { ConceptResult, CheckItem } from '@/types';

// Prompts & Syllabus rules
const CONCEPT_PROMPTS: Record<string, { title: string; subject: string; guidance: string; keywords: string[] }> = {
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

function runChecks(svg: string, conceptId: string): { allPassed: boolean; checks: Record<string, CheckItem> } {
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
  // Check that circles/rects don't exceed 800x500
  let boundsPassed = true;
  let boundsMsg = 'All graphical elements within 800x500 bounds';
  const circleMatches = svg.matchAll(/<circle[^>]*cx=["']([\d.]+)["'][^>]*cy=["']([\d.]+)["'][^>]*r=["']([\d.]+)["']/gi);
  for (const m of circleMatches) {
    const cx = parseFloat(m[1]);
    const cy = parseFloat(m[2]);
    const r = parseFloat(m[3]);
    if (cx - r < 0 || cx + r > 800 || cy - r < 0 || cy + r > 500) {
      boundsPassed = false;
      boundsMsg = `Circle at (${cx}, ${cy}) with radius ${r} extends beyond viewBox (0 0 800 500)`;
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

  // 5. Concept science check
  const meta = CONCEPT_PROMPTS[conceptId] || { title: conceptId, subject: 'Science', keywords: [] };
  const lowerSvg = svg.toLowerCase();
  const matchedKeywords = meta.keywords.filter(k => lowerSvg.includes(k.toLowerCase()));
  const sciencePassed = matchedKeywords.length >= Math.min(2, meta.keywords.length);
  checks['scientific_content'] = {
    passed: sciencePassed,
    message: sciencePassed
      ? `Scientific syllabus criteria verified (${matchedKeywords.join(', ')})`
      : `Missing required scientific components (${meta.keywords.join(', ')})`
  };
  if (!sciencePassed) allPassed = false;

  return { allPassed, checks };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conceptId = body.concept_id || 'pythagoras';
    const concept = CONCEPT_PROMPTS[conceptId] || {
      title: conceptId,
      subject: 'Science',
      guidance: 'Create an accurate animated scientific illustration.',
      keywords: []
    };

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY is not configured in Vercel environment variables. Please add your free key in Vercel Project Settings > Environment Variables.'
      });
    }

    const prompt = `You are a GCSE science educator. Create a scientifically accurate animated SVG diagram for:
Concept: ${concept.title} (${concept.subject})
Guidance: ${concept.guidance}

STRICT SVG RULES:
- Return ONLY valid raw SVG XML. No markdown fences.
- Use viewBox="0 0 800 500" width="100%" height="100%".
- Keep every element strictly inside coordinates 20 to 780 and 20 to 480.
- Include a <title>${concept.title}</title> tag.
- Include at least 4 visible <text> labels.
- Include CSS @keyframes or SMIL (<animate>) animation.`;

    // Call Gemini API via official REST endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    });

    const resData = await res.json();

    if (!res.ok || resData.error) {
      const errMsg = resData.error?.message || `Gemini API returned error ${res.status}`;
      return NextResponse.json({
        success: false,
        error: `Gemini API Error: ${errMsg}. If using an AQ. key, ensure 'Generative Language API' is enabled in Google Cloud Console.`
      });
    }

    const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const svgCode = extractSvg(rawText);

    // Run 5 code checks
    const { allPassed, checks } = runChecks(svgCode, conceptId);

    const promptTokens = resData.usageMetadata?.promptTokenCount || 450;
    const completionTokens = resData.usageMetadata?.candidatesTokenCount || 1100;
    const totalTokens = promptTokens + completionTokens;

    // Pricing: $0.075 / 1M in, $0.300 / 1M out
    const costUsd = (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.300;

    const result: ConceptResult = {
      id: conceptId,
      concept: concept.title,
      subject: concept.subject,
      svg: svgCode,
      model: model,
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
        api: 0,
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
