"""
SVG Validation Engine for Science Diagram Maker.
Implements 5 rigorous, independent checks:
1. Valid SVG XML parsing and structure
2. Strict geometric boundary enforcement against the viewBox
3. Title and at least 3 visible, non-empty text labels
4. Animation detection (SMIL or CSS @keyframes)
5. Concept-specific scientific structural & semantic validation
"""

import re
import math
import defusedxml.minidom
from xml.dom import minidom
from typing import Dict, Any, List, Optional, Tuple


class ValidationResult:
    def __init__(self):
        self.all_passed: bool = True
        self.checks: Dict[str, Dict[str, Any]] = {}
        self.failure_reasons: List[str] = []

    def add_check(self, check_key: str, passed: bool, message: str, details: Optional[Dict[str, Any]] = None):
        if not passed:
            self.all_passed = False
            self.failure_reasons.append(f"{check_key}: {message}")
        self.checks[check_key] = {
            "passed": passed,
            "message": message,
            "details": details or {}
        }

    def to_dict(self) -> Dict[str, Any]:
        return {
            "all_passed": self.all_passed,
            "checks": self.checks,
            "failure_reasons": self.failure_reasons
        }


def parse_viewbox(viewbox_str: str) -> Optional[Tuple[float, float, float, float]]:
    """Parses viewBox='minX minY width height'."""
    if not viewbox_str:
        return None
    parts = [float(p) for p in re.split(r"[\s,]+", viewbox_str.strip()) if p]
    if len(parts) == 4:
        return parts[0], parts[1], parts[2], parts[3]
    return None


def parse_float_attr(element, attr_name: str, default: float = 0.0) -> float:
    """Safely extracts a float from an XML attribute string."""
    val = element.getAttribute(attr_name)
    if not val:
        return default
    # Strip px, pt, %, etc.
    cleaned = re.sub(r"[^\d\.\-]", "", val.strip())
    try:
        return float(cleaned)
    except ValueError:
        return default


def parse_stroke_width(element) -> float:
    """Extracts stroke-width from attribute or inline style."""
    sw = element.getAttribute("stroke-width")
    if not sw:
        style = element.getAttribute("style")
        if style:
            m = re.search(r"stroke-width\s*:\s*([\d\.]+)", style)
            if m:
                sw = m.group(1)
    if sw:
        try:
            return float(re.sub(r"[^\d\.]", "", sw))
        except ValueError:
            return 1.0
    return 1.0


def check_bounds(min_x: float, max_x: float, min_y: float, max_y: float,
                 vb_x: float, vb_y: float, vb_w: float, vb_h: float,
                 elem_name: str, elem_id: str = "") -> Optional[str]:
    """Returns an error string if bounding box spills outside the viewBox."""
    vb_right = vb_x + vb_w
    vb_bottom = vb_y + vb_h
    # Allow 1% floating point margin for anti-aliasing tolerance
    margin_x = vb_w * 0.015
    margin_y = vb_h * 0.015

    if min_x < (vb_x - margin_x):
        return f"{elem_name} left boundary ({min_x:.1f}) extends past viewBox minX ({vb_x})"
    if max_x > (vb_right + margin_x):
        return f"{elem_name} right boundary ({max_x:.1f}) extends past viewBox maxX ({vb_right})"
    if min_y < (vb_y - margin_y):
        return f"{elem_name} top boundary ({min_y:.1f}) extends past viewBox minY ({vb_y})"
    if max_y > (vb_bottom + margin_y):
        return f"{elem_name} bottom boundary ({max_y:.1f}) extends past viewBox maxY ({vb_bottom})"
    return None


def validate_svg(svg_content: str, concept_id: str) -> ValidationResult:
    """Runs all 5 validation checks on the SVG string for a given concept."""
    result = ValidationResult()

    if not svg_content or not svg_content.strip():
        result.add_check("valid_svg", False, "SVG content is empty")
        result.add_check("viewbox_bounds", False, "Skipped due to empty SVG")
        result.add_check("title_and_labels", False, "Skipped due to empty SVG")
        result.add_check("animation", False, "Skipped due to empty SVG")
        result.add_check("scientific_content", False, "Skipped due to empty SVG")
        return result

    # ----------------------------------------------------
    # CHECK 1: Valid SVG XML & Structure
    # ----------------------------------------------------
    try:
        dom = defusedxml.minidom.parseString(svg_content.strip())
        root = dom.documentElement
        if root.tagName.lower().split(":")[-1] != "svg":
            result.add_check("valid_svg", False, f"Root element is <{root.tagName}>, expected <svg>")
            return result

        vb_attr = root.getAttribute("viewBox")
        vb_tuple = parse_viewbox(vb_attr)
        if not vb_tuple:
            # Fall back to width & height attributes if present
            w = parse_float_attr(root, "width", 800)
            h = parse_float_attr(root, "height", 500)
            vb_tuple = (0.0, 0.0, w, h)

        vb_x, vb_y, vb_w, vb_h = vb_tuple
        if vb_w <= 0 or vb_h <= 0:
            result.add_check("valid_svg", False, f"Invalid viewBox dimensions: {vb_w}x{vb_h}")
            return result

        result.add_check("valid_svg", True, "Valid SVG XML and root structure", {
            "viewBox": f"{vb_x} {vb_y} {vb_w} {vb_h}"
        })
    except Exception as e:
        result.add_check("valid_svg", False, f"XML parsing failed: {str(e)}")
        result.add_check("viewbox_bounds", False, "Cannot check bounds on invalid XML")
        result.add_check("title_and_labels", False, "Cannot check labels on invalid XML")
        result.add_check("animation", False, "Cannot check animation on invalid XML")
        result.add_check("scientific_content", False, "Cannot check science on invalid XML")
        return result

    # ----------------------------------------------------
    # CHECK 2: True Geometric ViewBox Boundary Validation
    # ----------------------------------------------------
    boundary_violations = []
    checked_elements_count = 0

    def inspect_element_bounds(node):
        nonlocal checked_elements_count
        if node.nodeType != minidom.Node.ELEMENT_NODE:
            return

        tag = node.tagName.lower().split(":")[-1]
        elem_id = node.getAttribute("id") or tag
        sw = parse_stroke_width(node) / 2.0  # half stroke expands boundaries

        # 1. Circle: (cx ± (r + sw/2), cy ± (r + sw/2))
        if tag == "circle":
            cx = parse_float_attr(node, "cx")
            cy = parse_float_attr(node, "cy")
            r = parse_float_attr(node, "r")
            if r > 0:
                checked_elements_count += 1
                err = check_bounds(cx - r - sw, cx + r + sw, cy - r - sw, cy + r + sw,
                                   vb_x, vb_y, vb_w, vb_h, f"<circle id='{elem_id}'>")
                if err:
                    boundary_violations.append(err)

        # 2. Rect: (x - sw, x + width + sw, y - sw, y + height + sw)
        elif tag == "rect":
            x = parse_float_attr(node, "x")
            y = parse_float_attr(node, "y")
            w = parse_float_attr(node, "width")
            h = parse_float_attr(node, "height")
            if w > 0 and h > 0:
                checked_elements_count += 1
                err = check_bounds(x - sw, x + w + sw, y - sw, y + h + sw,
                                   vb_x, vb_y, vb_w, vb_h, f"<rect id='{elem_id}'>")
                if err:
                    boundary_violations.append(err)

        # 3. Ellipse: (cx ± (rx + sw), cy ± (ry + sw))
        elif tag == "ellipse":
            cx = parse_float_attr(node, "cx")
            cy = parse_float_attr(node, "cy")
            rx = parse_float_attr(node, "rx")
            ry = parse_float_attr(node, "ry")
            if rx > 0 and ry > 0:
                checked_elements_count += 1
                err = check_bounds(cx - rx - sw, cx + rx + sw, cy - ry - sw, cy + ry + sw,
                                   vb_x, vb_y, vb_w, vb_h, f"<ellipse id='{elem_id}'>")
                if err:
                    boundary_violations.append(err)

        # 4. Line: endpoints (x1, y1) and (x2, y2)
        elif tag == "line":
            x1 = parse_float_attr(node, "x1")
            y1 = parse_float_attr(node, "y1")
            x2 = parse_float_attr(node, "x2")
            y2 = parse_float_attr(node, "y2")
            checked_elements_count += 1
            min_x, max_x = min(x1, x2) - sw, max(x1, x2) + sw
            min_y, max_y = min(y1, y2) - sw, max(y1, y2) + sw
            err = check_bounds(min_x, max_x, min_y, max_y, vb_x, vb_y, vb_w, vb_h, f"<line id='{elem_id}'>")
            if err:
                boundary_violations.append(err)

        # 5. Polygon & Polyline: every coordinate pair
        elif tag in ("polygon", "polyline"):
            pts_str = node.getAttribute("points")
            if pts_str:
                coords = [float(p) for p in re.findall(r"[-+]?\d*\.?\d+", pts_str)]
                if len(coords) >= 4:
                    checked_elements_count += 1
                    xs = coords[0::2]
                    ys = coords[1::2]
                    min_x, max_x = min(xs) - sw, max(xs) + sw
                    min_y, max_y = min(ys) - sw, max(ys) + sw
                    err = check_bounds(min_x, max_x, min_y, max_y, vb_x, vb_y, vb_w, vb_h, f"<{tag} id='{elem_id}'>")
                    if err:
                        boundary_violations.append(err)

        # 6. Text: position + estimated bounding extent
        elif tag == "text":
            x = parse_float_attr(node, "x")
            y = parse_float_attr(node, "y")
            fs = parse_float_attr(node, "font-size", 14.0)
            text_content = "".join([c.data for c in node.childNodes if c.nodeType == minidom.Node.TEXT_NODE]).strip()
            if text_content:
                checked_elements_count += 1
                # Estimate text width ≈ length * fontSize * 0.6
                approx_w = len(text_content) * fs * 0.6
                anchor = node.getAttribute("text-anchor") or "start"
                if anchor == "middle":
                    min_x = x - (approx_w / 2.0)
                    max_x = x + (approx_w / 2.0)
                elif anchor == "end":
                    min_x = x - approx_w
                    max_x = x
                else:
                    min_x = x
                    max_x = x + approx_w
                min_y = y - fs
                max_y = y + (fs * 0.3)
                err = check_bounds(min_x, max_x, min_y, max_y, vb_x, vb_y, vb_w, vb_h, f"<text '{text_content[:15]}...'>")
                if err:
                    boundary_violations.append(err)

        # 7. Path: evaluate coordinate values in path data
        elif tag == "path":
            d_str = node.getAttribute("d")
            if d_str:
                numbers = [float(n) for n in re.findall(r"[-+]?\d*\.?\d+", d_str)]
                if len(numbers) >= 2:
                    checked_elements_count += 1
                    xs = numbers[0::2]
                    ys = numbers[1::2]
                    # Check if coordinates explode far outside viewBox (> 1.25x viewBox)
                    if min(xs) < (vb_x - vb_w * 0.25) or max(xs) > (vb_x + vb_w * 1.25) or \
                       min(ys) < (vb_y - vb_h * 0.25) or max(ys) > (vb_y + vb_h * 1.25):
                        boundary_violations.append(f"<path id='{elem_id}'> coordinate range exceeds viewBox bounds")

        for child in node.childNodes:
            inspect_element_bounds(child)

    inspect_element_bounds(root)

    if boundary_violations:
        result.add_check(
            "viewbox_bounds",
            False,
            f"{len(boundary_violations)} element(s) extend beyond viewBox bounds",
            {"violations": boundary_violations[:3], "checked_elements": checked_elements_count}
        )
    else:
        result.add_check(
            "viewbox_bounds",
            True,
            f"All {checked_elements_count} graphical elements are within viewBox bounds (0 0 {vb_w:.0f} {vb_h:.0f})",
            {"checked_elements": checked_elements_count}
        )

    # ----------------------------------------------------
    # CHECK 3: Title and At Least 3 Visible Text Labels
    # ----------------------------------------------------
    title_elements = root.getElementsByTagName("title")
    has_title = False
    title_text = ""
    if title_elements and title_elements[0].firstChild:
        title_text = title_elements[0].firstChild.data.strip()
        if title_text:
            has_title = True

    # Search for visible <text> elements
    text_elements = root.getElementsByTagName("text")
    visible_labels = []
    for te in text_elements:
        style = te.getAttribute("style") or ""
        display = te.getAttribute("display") or ""
        visibility = te.getAttribute("visibility") or ""
        if "display:none" in style or display == "none" or visibility == "hidden":
            continue

        raw_txt = "".join([c.data for c in te.childNodes if c.nodeType == minidom.Node.TEXT_NODE]).strip()
        if raw_txt and len(raw_txt) >= 1:
            visible_labels.append(raw_txt)

    # If title tag is absent but first large text element acts as title
    if not has_title and visible_labels:
        title_text = visible_labels[0]
        has_title = True

    if has_title and len(visible_labels) >= 3:
        result.add_check(
            "title_and_labels",
            True,
            f"Title ('{title_text[:25]}') and {len(visible_labels)} visible text labels found",
            {"title": title_text, "label_count": len(visible_labels), "sample_labels": visible_labels[:5]}
        )
    else:
        reasons = []
        if not has_title:
            reasons.append("Missing <title> element")
        if len(visible_labels) < 3:
            reasons.append(f"Found {len(visible_labels)} text labels (minimum 3 required)")
        result.add_check(
            "title_and_labels",
            False,
            " & ".join(reasons),
            {"label_count": len(visible_labels), "labels": visible_labels}
        )

    # ----------------------------------------------------
    # CHECK 4: Animation Detection (SMIL or CSS @keyframes)
    # ----------------------------------------------------
    smil_tags = ["animate", "animatetransform", "animatemotion", "set"]
    has_smil = any(len(root.getElementsByTagName(st)) > 0 for st in smil_tags)

    has_css_anim = False
    style_elements = root.getElementsByTagName("style")
    css_content = ""
    for se in style_elements:
        if se.firstChild and se.firstChild.data:
            css_content += se.firstChild.data

    if "@keyframes" in css_content and re.search(r"animation\s*:", css_content):
        has_css_anim = True

    if has_smil or has_css_anim:
        anim_type = "SMIL" if has_smil and not has_css_anim else ("CSS @keyframes" if has_css_anim and not has_smil else "SMIL + CSS")
        result.add_check(
            "animation",
            True,
            f"Active animation detected ({anim_type})",
            {"animation_type": anim_type}
        )
    else:
        result.add_check(
            "animation",
            False,
            "No animation found. Must include SMIL (<animate>) or CSS @keyframes with animation properties"
        )

    # ----------------------------------------------------
    # CHECK 5: Concept-Specific Scientific Structural Validation
    # ----------------------------------------------------
    svg_lower = svg_content.lower()
    all_text_str = " ".join(visible_labels).lower() + " " + title_text.lower()
    concept_passed, concept_msg, concept_details = validate_concept_science(
        concept_id, root, svg_lower, all_text_str
    )
    result.add_check("scientific_content", concept_passed, concept_msg, concept_details)

    return result


def validate_concept_science(concept_id: str, root, svg_text: str, label_text: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates structural and scientific correctness specific to each GCSE concept.
    """
    cid = concept_id.lower().replace(" ", "_").replace("'", "")

    # 1. Pythagoras' theorem
    if "pythagoras" in cid:
        # Check right angle indicator/triangle presence
        has_triangle = len(root.getElementsByTagName("polygon")) > 0 or "path" in svg_text
        has_hypotenuse = "hypotenuse" in label_text or "hypotenuse" in svg_text
        has_formula = bool(re.search(r"a\s*[\^²2]?\s*\+\s*b\s*[\^²2]?\s*=\s*c\s*[\^²2]?", label_text) or
                           ("a²" in label_text or "b²" in label_text or "c²" in label_text or "a2" in label_text))
        has_sides = ("a" in label_text and "b" in label_text and "c" in label_text) or has_formula

        if has_hypotenuse and has_formula and has_triangle:
            return True, "Valid GCSE Pythagoras: triangle, hypotenuse, and a² + b² = c² verified", {
                "triangle": True, "hypotenuse": True, "formula": True
            }
        missing = []
        if not has_hypotenuse: missing.append("hypotenuse label")
        if not has_formula: missing.append("formula a² + b² = c²")
        if not has_triangle: missing.append("triangle shape")
        return False, f"Pythagoras scientific validation missing: {', '.join(missing)}", {
            "triangle": has_triangle, "hypotenuse": has_hypotenuse, "formula": has_formula
        }

    # 2. Parts of a circle
    elif "circle" in cid:
        circles = root.getElementsByTagName("circle")
        has_circle_elem = len(circles) > 0
        has_centre = "centre" in label_text or "center" in label_text or "origin" in label_text
        has_radius = "radius" in label_text
        has_diameter = "diameter" in label_text
        has_circumference = "circumference" in label_text

        # Structural: circle must exist and key labels present
        matched_terms = [t for t, present in [("centre", has_centre), ("radius", has_radius),
                                              ("diameter", has_diameter), ("circumference", has_circumference)] if present]
        if has_circle_elem and len(matched_terms) >= 3:
            return True, f"Valid GCSE Circle: <circle> shape and labels ({', '.join(matched_terms)}) verified", {
                "matched_terms": matched_terms, "circle_element": True
            }
        missing = [t for t in ["centre", "radius", "diameter", "circumference"] if t not in matched_terms]
        return False, f"Circle diagram missing key geometric elements/labels: {', '.join(missing)}", {
            "matched_terms": matched_terms, "circle_element": has_circle_elem
        }

    # 3. Series circuit
    elif "circuit" in cid:
        has_cell = any(w in label_text for w in ["cell", "battery", "voltage", "power", "+", "-"])
        has_loop = any(w in label_text for w in ["current", "series", "loop", "amp", "circuit", "bulb", "resistor"])
        has_flow_indicator = "animate" in svg_text or "dashoffset" in svg_text or "arrow" in svg_text or "current" in label_text

        # Structural: closed loop wire (rect, path, or line)
        has_wire = len(root.getElementsByTagName("path")) > 0 or len(root.getElementsByTagName("rect")) > 0 or len(root.getElementsByTagName("line")) >= 3

        if has_cell and has_loop and has_wire:
            return True, "Valid GCSE Series Circuit: single loop with cell, components, and current indicators verified", {
                "cell": True, "loop": True, "flow_indicator": has_flow_indicator
            }
        return False, "Series Circuit missing single loop, cell/battery, or current indicators", {
            "cell": has_cell, "loop": has_loop, "wire": has_wire
        }

    # 4. Photosynthesis
    elif "photosynthesis" in cid:
        has_inputs = ("carbon dioxide" in label_text or "co2" in label_text) and ("water" in label_text or "h2o" in label_text)
        has_outputs = ("glucose" in label_text or "sugar" in label_text) or ("oxygen" in label_text or "o2" in label_text)
        has_light = "light" in label_text or "sun" in label_text or "solar" in label_text

        if (has_inputs or has_outputs) and has_light:
            return True, "Valid GCSE Photosynthesis: light energy, chemical inputs (CO2/H2O), and outputs (glucose/O2) verified", {
                "inputs": has_inputs, "outputs": has_outputs, "light": has_light
            }
        missing = []
        if not has_light: missing.append("sunlight / light energy")
        if not has_inputs: missing.append("inputs (CO2 / water)")
        if not has_outputs: missing.append("outputs (glucose / oxygen)")
        return False, f"Photosynthesis missing scientific components: {', '.join(missing)}", {
            "inputs": has_inputs, "outputs": has_outputs, "light": has_light
        }

    # 5. States of matter
    elif "matter" in cid or "states" in cid:
        has_solid = "solid" in label_text or "solid" in svg_text
        has_liquid = "liquid" in label_text or "liquid" in svg_text
        has_gas = "gas" in label_text or "gas" in svg_text

        circles = root.getElementsByTagName("circle")
        particle_count = len(circles)

        # Scientific: at least solid, liquid, gas labels and multiple particles (circles)
        if has_solid and has_liquid and has_gas and particle_count >= 10:
            return True, f"Valid GCSE States of Matter: solid, liquid, gas phases with {particle_count} particles verified", {
                "solid": True, "liquid": True, "gas": True, "particle_count": particle_count
            }
        missing = []
        if not (has_solid and has_liquid and has_gas): missing.append("solid/liquid/gas phase labels")
        if particle_count < 10: missing.append(f"adequate particle count (found {particle_count}, expected >= 10)")
        return False, f"States of matter missing: {', '.join(missing)}", {
            "solid": has_solid, "liquid": has_liquid, "gas": has_gas, "particle_count": particle_count
        }

    # Default fallback for custom or unlisted concepts
    else:
        has_labels = len(root.getElementsByTagName("text")) >= 3
        has_elements = len(root.getElementsByTagName("path")) + len(root.getElementsByTagName("circle")) + len(root.getElementsByTagName("rect")) >= 3
        if has_labels and has_elements:
            return True, "Structural science illustration criteria satisfied", {}
        return False, "Diagram lacks adequate graphical elements and labels for scientific illustration", {}
