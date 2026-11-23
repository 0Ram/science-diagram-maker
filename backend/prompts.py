"""
GCSE Science Diagram Prompts and Definitions.
Contains concept definitions, educational constraints, and prompt builders.
"""

from typing import Dict, Any, Optional

CONCEPTS: Dict[str, Dict[str, str]] = {
    "pythagoras": {
        "id": "pythagoras",
        "title": "Pythagoras' theorem",
        "subject": "Maths",
        "concept_text": "In a right-angled triangle, the longest side is called the hypotenuse. The square of the hypotenuse is equal to the sum of the squares of the other two sides: a2 + b2 = c2.",
        "specific_guidance": """
- Draw a clear right-angled triangle positioned in the center with vertices clearly visible.
- Label the vertical side 'Side a', horizontal side 'Side b', and diagonal longest side 'Hypotenuse c'.
- Include a square right-angle symbol at the 90° corner.
- Display the mathematical equation prominently: 'a² + b² = c²'.
- Draw squares extending from each side (area a², area b², area c²) or animate glowing highlights on the squares showing their equivalence.
- Animation: Animate the squares' stroke/fill or animate the formula highlight using CSS @keyframes or SMIL.
"""
    },
    "circle": {
        "id": "circle",
        "title": "Parts of a circle",
        "subject": "Maths",
        "concept_text": "A circle has a centre. The radius is the distance from the centre to the edge. The diameter goes across the circle through the centre and is twice the radius. The circumference is the distance around the circle.",
        "specific_guidance": """
- Draw a prominent circle (radius 120-140px) centered at (400, 250).
- Mark the central point with a small filled dot and label 'Centre (O)'.
- Draw a line from centre to perimeter and label 'Radius (r)'.
- Draw a full horizontal line through centre from edge to edge and label 'Diameter (d = 2r)'.
- Label the outer perimeter line 'Circumference (C = 2πr)'.
- Animation: Animate the circumference perimeter tracing with stroke-dasharray and stroke-dashoffset, or pulse the radius line.
"""
    },
    "circuit": {
        "id": "circuit",
        "title": "Series circuit",
        "subject": "Physics",
        "concept_text": "In a series circuit there is only one loop. The current is the same everywhere in the loop. The voltage of the cell is shared between the components.",
        "specific_guidance": """
- Draw a single closed rectangular wire loop (approx 550x300px centered).
- Top wire: Draw a battery/cell with standard long and short parallel plate symbols (+ and -). Label 'Cell / Battery (V)'.
- Right & bottom wire: Draw two separate components in series (e.g. circle with cross for Lamp 1 and Lamp 2, or resistor boxes). Label 'Component 1 (V₁)' and 'Component 2 (V₂)'.
- Include labels: 'Single Loop', 'Current (I) is constant everywhere', and 'V = V₁ + V₂'.
- Animation: Animate multiple circular dots (representing electrons/charges) smoothly circulating around the rectangular circuit path.
"""
    },
    "photosynthesis": {
        "id": "photosynthesis",
        "title": "Photosynthesis",
        "subject": "Biology",
        "concept_text": "Plants take in carbon dioxide and water. They use light energy, absorbed by chlorophyll, to make glucose and oxygen.",
        "specific_guidance": """
- Center: Draw a large, vibrant green plant leaf with vein structure, and indicate 'Chlorophyll'.
- Top Left: Draw a glowing sun with yellow rays beaming toward the leaf, labeled 'Light Energy (Sunlight)'.
- Inputs: Draw arrows entering the leaf: 'Carbon Dioxide (CO₂)' from air, and 'Water (H₂O)' from stem/soil.
- Outputs: Draw arrows exiting the leaf: 'Glucose (C₆H₁₂O₆)' stored in plant, and 'Oxygen (O₂)' released into air.
- Display the chemical word equation: 'Carbon Dioxide + Water —(Light + Chlorophyll)→ Glucose + Oxygen'.
- Animation: Animate sunlight rays pulsing towards the leaf, and dashed arrows flowing into and out of the leaf.
"""
    },
    "matter": {
        "id": "matter",
        "title": "States of matter",
        "subject": "Chemistry",
        "concept_text": "In a solid the particles are close together and vibrate in place. In a liquid they are close but move past each other. In a gas they are far apart and move fast.",
        "specific_guidance": """
- Draw 3 distinct, equal-sized rectangular container boxes side-by-side:
  1. Box 1 (Left): Label 'Solid'. Inside: 16 tightly-packed particle circles arranged in a neat regular 4x4 grid touching each other.
  2. Box 2 (Center): Label 'Liquid'. Inside: ~14 particle circles close together but in an irregular, disordered arrangement.
  3. Box 3 (Right): Label 'Gas'. Inside: 5 to 7 particle circles spaced widely apart with motion arrows.
- Explanatory labels beneath boxes: 'Vibrate in fixed positions', 'Move past each other', 'Move fast in all directions'.
- Animation:
  - Solid: Tiny subtle vibration/jitter on particles (transform translate ±1px).
  - Liquid: Slow gentle floating movement past each other.
  - Gas: Rapid translation of particles bouncing inside container.
"""
    }
}


def build_prompt(concept_id: str, feedback: Optional[str] = None) -> str:
    """
    Builds a highly constrained, GCSE-accurate prompt for Gemini.
    """
    cid = concept_id.lower().replace(" ", "_").replace("'", "")
    concept = None
    for k, v in CONCEPTS.items():
        if k in cid or cid in k:
            concept = v
            break

    if not concept:
        concept = {
            "title": concept_id,
            "subject": "Science",
            "concept_text": concept_id,
            "specific_guidance": "Create an accurate scientific diagram with clear labels and animation."
        }

    correction_section = ""
    if feedback:
        correction_section = f"""
==================================================================
CRITICAL CORRECTION REQUIRED FROM PREVIOUS ATTEMPT:
Your previous SVG generation failed automated code checks with these errors:
{feedback}

YOU MUST RESOLVE ALL OF THE ABOVE FAILURES:
- Strictly ensure every graphical element and label is inside viewBox 0 0 800 500.
- Verify stroke width does not push circles or shapes past boundaries.
- Ensure at least 3 visible <text> elements exist with meaningful labels.
- Ensure a valid <title> tag is included.
- Include CSS @keyframes or SMIL (<animate>) animation.
==================================================================
"""

    prompt = f"""You are an elite GCSE science educational illustrator and SVG expert.
Create a visually stunning, scientifically accurate, and animated SVG diagram explaining the following GCSE concept.

CONCEPT DETAILS:
- Subject: {concept['subject']}
- Title: {concept['title']}
- Syllabus Explanation: {concept['concept_text']}

SPECIFIC DIAGRAM REQUIREMENTS:
{concept['specific_guidance']}

STRICT TECHNICAL & GEOMETRIC RULES:
1. Output format: Return ONLY raw, valid SVG XML. Do not include markdown fences, explanations, or commentary.
2. Dimensions: Set viewBox="0 0 800 500" with width="100%" and height="100%".
3. Coordinate Bounds: ALL elements (circles, rectangles, lines, paths, text labels) MUST lie completely inside x: 20 to 780 and y: 20 to 480. Do not place elements touching or crossing the outer edges.
4. Title & Labels:
   - Must include a <title>{concept['title']}</title> tag as the first child of <svg>.
   - Must include at least 4 visible, legible <text> elements with clean font-family="system-ui, -apple-system, sans-serif" and font-size between 13px and 22px.
   - Text contrast: Use dark text (#0f172a) on light backgrounds, or white text on dark shapes.
5. Animation:
   - Must include at least one continuous, smooth animation using CSS @keyframes inside a <style> block OR SMIL (<animate>, <animateTransform>).
   - Animations must be educational (e.g. demonstrating flow, vibration, or rays), not distracting.
6. Scientific Authenticity: The diagram must look like a high-end UK GCSE textbook illustration with clean lines, modern rounded corners, and clear scientific meaning.
{correction_section}
Remember: Output ONLY the SVG XML starting with <svg> and ending with </svg>.
"""
    return prompt
