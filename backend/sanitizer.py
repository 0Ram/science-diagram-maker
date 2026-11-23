"""
SVG Sanitizer module for Science Diagram Maker.
Safely cleans model-generated SVG to prevent XSS, malicious scripts,
and external resource loading before storage or client rendering.
"""

import re
import defusedxml.minidom
from xml.dom import minidom
from typing import Tuple, List

# Allowed safe SVG tags for scientific illustrations
ALLOWED_TAGS = {
    "svg", "g", "defs", "style", "title", "desc", "a",
    "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
    "text", "tspan", "textpath",
    "animate", "animatetransform", "animatemotion", "set",
    "lineargradient", "radialgradient", "stop",
    "marker", "pattern", "clipPath", "mask", "filter", "feGaussianBlur", "feMerge", "feMergeNode"
}

# Forbidden tags that must always be removed
DANGEROUS_TAGS = {
    "script", "foreignobject", "iframe", "object", "embed", "link", "meta", "base"
}

# Allowed presentation and animation attributes
ALLOWED_ATTR_PREFIXES = ("stroke", "fill", "font", "aria", "data-")
ALLOWED_ATTRS = {
    "viewbox", "width", "height", "xmlns", "xmlns:xlink", "version", "id", "class",
    "x", "y", "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2", "d", "points",
    "transform", "style", "opacity", "stop-color", "stop-opacity", "offset",
    "attributeName", "attributeType", "from", "to", "dur", "repeatCount",
    "begin", "end", "values", "keyTimes", "keySplines", "calcMode", "type",
    "by", "additive", "accumulate", "restart",
    "marker-start", "marker-mid", "marker-end", "markerWidth", "markerHeight",
    "refX", "refY", "orient", "clip-path", "mask", "filter",
    "text-anchor", "dominant-baseline", "alignment-baseline", "dx", "dy"
}

# Dangerous URL schemes in attributes
DANGEROUS_SCHEMES = re.compile(r"^\s*(javascript|data|vbscript):", re.IGNORECASE)


def extract_svg_code(raw_content: str) -> str:
    """Extracts raw SVG code from LLM response, stripping markdown fences."""
    if not raw_content:
        return ""
    # Strip markdown code blocks
    content = raw_content.strip()
    if "```" in content:
        # Match ```xml ... ``` or ```svg ... ``` or ``` ... ```
        match = re.search(r"```(?:xml|svg)?\s*(.*?)\s*```", content, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1).strip()
    
    # Locate <svg and </svg>
    start = content.find("<svg")
    end = content.rfind("</svg>")
    if start != -1 and end != -1:
        return content[start : end + 6].strip()
    elif start != -1:
        # Unclosed tag fallback
        return content[start:].strip()
    return content.strip()


def sanitize_svg(raw_svg: str) -> Tuple[str, List[str]]:
    """
    Sanitizes SVG string by removing dangerous tags, script attributes,
    and external URLs. Returns (clean_svg_string, list_of_removed_items).
    """
    removed_items: List[str] = []
    clean_code = extract_svg_code(raw_svg)
    if not clean_code:
        return "", ["Empty or missing SVG content"]

    try:
        # Parse securely with defusedxml
        dom = defusedxml.minidom.parseString(clean_code)
    except Exception as e:
        return "", [f"XML parsing failed during sanitization: {str(e)}"]

    def clean_node(node):
        if node.nodeType != minidom.Node.ELEMENT_NODE:
            return

        tag_name = node.tagName.lower().split(":")[-1]

        # 1. Reject dangerous or disallowed tags
        if tag_name in DANGEROUS_TAGS or (tag_name not in ALLOWED_TAGS and not tag_name.startswith("animate")):
            removed_items.append(f"Removed disallowed tag <{node.tagName}>")
            parent = node.parentNode
            if parent:
                parent.removeChild(node)
            return

        # 2. Inspect attributes
        attrs_to_remove = []
        for i in range(node.attributes.length):
            attr = node.attributes.item(i)
            attr_name = attr.name.lower()
            attr_value = attr.value

            # Strip event handlers (e.g. onclick, onload, onerror)
            if attr_name.startswith("on"):
                attrs_to_remove.append(attr.name)
                removed_items.append(f"Removed event handler '{attr.name}'")
                continue

            # Strip dangerous URI schemes in href, xlink:href, src, etc.
            if "href" in attr_name or "src" in attr_name:
                if DANGEROUS_SCHEMES.match(attr_value) or attr_value.strip().startswith("http"):
                    attrs_to_remove.append(attr.name)
                    removed_items.append(f"Removed external/dangerous link in '{attr.name}'")
                    continue

        for attr_name in attrs_to_remove:
            node.removeAttribute(attr_name)

        # 3. Inspect style content for dangerous URLs or expressions
        if tag_name == "style" and node.firstChild:
            css_text = node.firstChild.data
            if re.search(r"url\s*\(\s*['\"]?(?!#)", css_text, re.IGNORECASE) or "expression" in css_text:
                removed_items.append("Cleaned external URL/expression from <style>")
                node.firstChild.data = re.sub(r"url\s*\(\s*['\"]?(?!#).*?\)", "", css_text, flags=re.IGNORECASE)

        # Recursively process children
        children = list(node.childNodes)
        for child in children:
            clean_node(child)

    root = dom.documentElement
    clean_node(root)

    # Ensure viewBox exists, default to 0 0 800 500 if missing
    if not root.getAttribute("viewBox"):
        root.setAttribute("viewBox", "0 0 800 500")

    # Serialize back to string
    sanitized_xml = dom.toxml()
    # Strip XML declaration if present so it renders cleanly inline
    if sanitized_xml.startswith("<?xml"):
        sanitized_xml = re.sub(r"^<\?xml[^>]*\?>\s*", "", sanitized_xml)

    return sanitized_xml, removed_items
