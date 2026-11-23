"""Unit tests for backend.validator module."""

import pytest
from backend.validator import validate_svg


def test_validator_detects_malformed_xml():
    malformed = "<svg viewBox='0 0 800 500'><circle cx='100'></svg>"  # unclosed tags
    res = validate_svg(malformed, "pythagoras")
    assert not res.all_passed
    assert not res.checks["valid_svg"]["passed"]


def test_validator_catches_circle_out_of_bounds():
    # Circle with cx=790, r=30 extends to 820, exceeding 800 width!
    out_of_bounds_circle = """
    <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
        <title>Out of Bounds Circle</title>
        <circle cx="790" cy="250" r="30" fill="red"/>
        <text x="100" y="100">Label 1</text>
        <text x="100" y="150">Label 2</text>
        <text x="100" y="200">Label 3</text>
        <animate attributeName="opacity" from="0" to="1" dur="1s"/>
    </svg>
    """
    res = validate_svg(out_of_bounds_circle, "circle")
    assert not res.checks["viewbox_bounds"]["passed"]
    assert "right boundary" in res.checks["viewbox_bounds"]["details"]["violations"][0]


def test_validator_passes_in_bounds_geometry():
    in_bounds_circle = """
    <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
        <title>Parts of a Circle</title>
        <circle cx="400" cy="250" r="100" fill="lightblue" stroke="blue" stroke-width="2"/>
        <line x1="400" y1="250" x2="500" y2="250" stroke="black"/>
        <text x="400" y="245">Centre</text>
        <text x="450" y="240">Radius</text>
        <text x="400" y="380">Circumference</text>
        <text x="350" y="250">Diameter</text>
        <animate attributeName="opacity" from="0.8" to="1" dur="2s" repeatCount="indefinite"/>
    </svg>
    """
    res = validate_svg(in_bounds_circle, "parts_of_a_circle")
    assert res.checks["valid_svg"]["passed"]
    assert res.checks["viewbox_bounds"]["passed"]
    assert res.checks["title_and_labels"]["passed"]
    assert res.checks["animation"]["passed"]
    assert res.checks["scientific_content"]["passed"]
    assert res.all_passed


def test_validator_catches_missing_labels():
    insufficient_labels = """
    <svg viewBox="0 0 800 500">
        <title>Only Title</title>
        <text x="100" y="100">Only One Label</text>
        <animate attributeName="opacity" from="0" to="1" dur="1s"/>
    </svg>
    """
    res = validate_svg(insufficient_labels, "pythagoras")
    assert not res.checks["title_and_labels"]["passed"]
    assert "Found 1 text labels" in res.checks["title_and_labels"]["message"]


def test_validator_detects_css_animation():
    css_animated_svg = """
    <svg viewBox="0 0 800 500">
        <title>CSS Animation Test</title>
        <style>
            @keyframes pulse { 0% { opacity: 0.5; } 100% { opacity: 1.0; } }
            .particle { animation: pulse 2s infinite ease-in-out; }
        </style>
        <circle class="particle" cx="100" cy="100" r="10"/>
        <text x="100" y="200">A</text>
        <text x="100" y="250">B</text>
        <text x="100" y="300">C</text>
    </svg>
    """
    res = validate_svg(css_animated_svg, "test")
    assert res.checks["animation"]["passed"]
    assert "CSS" in res.checks["animation"]["message"]


def test_validator_concept_pythagoras():
    valid_pythagoras = """
    <svg viewBox="0 0 800 500">
        <title>Pythagoras Theorem</title>
        <polygon points="200,350 450,350 200,150" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
        <text x="210" y="260">Side a</text>
        <text x="320" y="370">Side b</text>
        <text x="340" y="230">Hypotenuse c</text>
        <text x="250" y="420">Formula: a² + b² = c²</text>
        <animate attributeName="stroke-width" values="2;4;2" dur="2s" repeatCount="indefinite"/>
    </svg>
    """
    res = validate_svg(valid_pythagoras, "pythagoras")
    assert res.checks["scientific_content"]["passed"]
    assert res.all_passed


def test_validator_concept_photosynthesis():
    photosynthesis_svg = """
    <svg viewBox="0 0 800 500">
        <title>GCSE Photosynthesis Diagram</title>
        <path d="M 200,300 C 250,200 350,200 400,300" fill="green"/>
        <text x="150" y="100">Sunlight Energy</text>
        <text x="100" y="250">Carbon Dioxide (CO2)</text>
        <text x="100" y="350">Water (H2O)</text>
        <text x="500" y="250">Glucose</text>
        <text x="500" y="350">Oxygen (O2)</text>
        <animate attributeName="opacity" from="0" to="1" dur="1s"/>
    </svg>
    """
    res = validate_svg(photosynthesis_svg, "photosynthesis")
    assert res.checks["scientific_content"]["passed"]
    assert res.all_passed
