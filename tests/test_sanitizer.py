"""Unit tests for backend.sanitizer module."""

import pytest
from backend.sanitizer import sanitize_svg, extract_svg_code


def test_extract_svg_code():
    raw_markdown = "Here is the diagram:\n```xml\n<svg viewBox='0 0 800 500'><title>Test</title></svg>\n```\nHope you like it!"
    extracted = extract_svg_code(raw_markdown)
    assert extracted.startswith("<svg")
    assert extracted.endswith("</svg>")


def test_sanitize_strips_script():
    malicious_svg = """
    <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
        <title>Safe Title</title>
        <script>alert('XSS Attack');</script>
        <circle cx="100" cy="100" r="20" fill="blue"/>
    </svg>
    """
    clean_svg, removed = sanitize_svg(malicious_svg)
    assert "<script" not in clean_svg
    assert "alert" not in clean_svg
    assert "<circle" in clean_svg
    assert any("script" in r.lower() for r in removed)


def test_sanitize_strips_event_handlers():
    malicious_svg = """
    <svg viewBox="0 0 800 500">
        <rect x="10" y="10" width="100" height="100" onclick="alert(1)" onload="evil()"/>
    </svg>
    """
    clean_svg, removed = sanitize_svg(malicious_svg)
    assert "onclick" not in clean_svg
    assert "onload" not in clean_svg
    assert any("onclick" in r.lower() for r in removed)


def test_sanitize_strips_external_urls():
    svg_with_links = """
    <svg viewBox="0 0 800 500">
        <a href="http://evil.com/malware.exe">
            <text x="50" y="50">Click Me</text>
        </a>
    </svg>
    """
    clean_svg, removed = sanitize_svg(svg_with_links)
    assert "http://evil.com" not in clean_svg
    assert any("external" in r.lower() or "href" in r.lower() for r in removed)


def test_sanitize_preserves_legitimate_svg():
    valid_svg = """
    <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
        <title>Pythagoras Theorem</title>
        <circle cx="200" cy="200" r="30" fill="teal">
            <animate attributeName="r" from="30" to="35" dur="1s" repeatCount="indefinite"/>
        </circle>
        <text x="200" y="260" font-size="14">Radius</text>
    </svg>
    """
    clean_svg, removed = sanitize_svg(valid_svg)
    assert "<animate" in clean_svg
    assert "<circle" in clean_svg
    assert "Pythagoras Theorem" in clean_svg
    assert len(removed) == 0
