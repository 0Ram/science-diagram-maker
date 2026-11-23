# Science Diagram Maker

> **AI-Powered GCSE Science Diagram Generator with Automated Code Verification & Reviewer Workflow**  
> Built for the **Udhi Technologies** Home Assignment.

---

## 1. Overview & Problem Context
At **Udhi Technologies**, animated lesson videos are produced for UK GCSE students. Large Language Models (LLMs) can generate SVG diagrams, but their raw outputs can often be malformed, geometrically out of bounds, scientifically inaccurate, or fail rate limits.

**Science Diagram Maker** is a production-grade web application and validation engine that:
1. Prompts a free Google Gemini model with concept-specific educational constraints to generate animated SVGs.
2. Runs **5 independent, automated code checks** in Python before accepting any diagram.
3. Implements an automated **self-correction feedback retry** if any check fails.
4. Handles API rate limits (`429`) and server overloads (`503`) with **exponential backoff**.
5. Computes exact token usage and estimated USD costs.
6. Presents an interactive **GCSE Reviewer Dashboard** in Next.js that loads the 5 verified diagrams instantly with **zero API dependency**, allows reviewers to **Approve or Reject** with persistent notes surviving page refreshes, and includes a **Live Generator** to test generation in real-time.

---

## 2. Live Demo & Links
- **Live Web Application**: [https://frontend-one-sepia-61.vercel.app](https://frontend-one-sepia-61.vercel.app)
- **GitHub Repository**: [https://github.com/0Ram/science-diagram-maker](https://github.com/0Ram/science-diagram-maker)
- **Master Dataset**: [`backend/data/results.json`](file:///Users/mudavathrambhumeshwar/Desktop/UDHI%20TECHNOLOGIES/backend/data/results.json) synced to [`frontend/public/data/results.json`](file:///Users/mudavathrambhumeshwar/Desktop/UDHI%20TECHNOLOGIES/frontend/public/data/results.json).

---

## 3. Official Results Table

| # | Concept | Subject | Status | Input / Output Tokens | Estimated Cost (USD) | Retries (Val / API) | Checks Summary |
| :-: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **Pythagoras' theorem** | Maths | **PASS** | 482 / 1,120 (1,602 total) | **$0.000372** | 0 / 0 | ✓ XML, ✓ Bounds, ✓ Title/Labels (6), ✓ SMIL/CSS, ✓ Science |
| **2** | **Parts of a circle** | Maths | **PASS** | 450 / 1,050 (1,500 total) | **$0.000349** | 0 / 0 | ✓ XML, ✓ Bounds, ✓ Title/Labels (8), ✓ SMIL/CSS, ✓ Science |
| **3** | **Series circuit** | Physics | **PASS** | 465 / 1,180 (1,645 total) | **$0.000389** | 0 / 0 | ✓ XML, ✓ Bounds, ✓ Title/Labels (8), ✓ SMIL/CSS, ✓ Science |
| **4** | **Photosynthesis** | Biology | **PASS** | 490 / 1,240 (1,730 total) | **$0.000409** | 0 / 0 | ✓ XML, ✓ Bounds, ✓ Title/Labels (7), ✓ SMIL/CSS, ✓ Science |
| **5** | **States of matter** | Chemistry | **PASS** | 475 / 1,310 (1,785 total) | **$0.000429** | 0 / 0 | ✓ XML, ✓ Bounds, ✓ Title/Labels (10), ✓ SMIL/CSS, ✓ Science |
| **—** | **Total Dataset** | **GCSE** | **5 / 5 Passed** | **2,362 / 5,900 (8,262 total)** | **$0.001948** | **0 / 0** | **100% Automated Verification** |

*All results are pre-computed and bundled into `results.json`. The web page renders all 5 diagrams immediately upon loading without consuming API quota.*

---

## 4. Architecture & Technology Stack

```
science-diagram-maker/
├── frontend/                     # Next.js 16 + TypeScript + Tailwind CSS
│   ├── src/app/                  # App Router (page.tsx, layout.tsx, globals.css)
│   ├── src/components/           # DashboardHeader, StatsCards, DiagramTable, DiagramModal, GenerateDialog
│   ├── src/lib/                  # api.ts (FastAPI & static fetcher), storage.ts (localStorage)
│   ├── src/types/                # Shared TypeScript models
│   └── public/data/results.json  # Synced static bundle (guarantees instant zero-API first load)
├── backend/                      # Python 3.12 + FastAPI
│   ├── main.py                   # FastAPI REST API (/api/health, /api/results, /api/generate)
│   ├── generator.py              # Gemini client with usage metadata extraction
│   ├── validator.py              # 5-check SVG validation engine with geometric math
│   ├── sanitizer.py              # Safe SVG sanitizer (stripping XSS scripts/foreignObjects)
│   ├── prompts.py                # Concept-specific GCSE science prompts
│   ├── retry.py                  # Two independent retry loops (API backoff vs. validation feedback)
│   ├── cost_calculator.py        # Configurable token pricing ($0.075 / $0.300 per 1M tokens)
│   ├── storage.py                # Master results manager & frontend synchronization
│   ├── schemas.py                # Pydantic schemas (Result, CheckItem, Usage, Retries)
│   ├── data/results.json         # Master dataset
│   └── scripts/                  # generate_all.py, seed_results.py
├── tests/                        # Pytest automated test suite (21 unit tests)
│   ├── test_validator.py         # Geometric boundary math, labels, animations, science rules
│   ├── test_sanitizer.py         # XSS prevention, script/event handler stripping
│   ├── test_cost.py              # Token economics and pricing calculations
│   ├── test_retry.py             # API exponential backoff and validation retry mocks
│   └── test_api.py               # FastAPI endpoint tests
├── .env.example
├── .gitignore
├── vercel.json
├── package.json
└── README.md
```

### Why this stack?
- **Python Backend**: Python's `defusedxml` and standard `xml.etree.ElementTree` provide secure, sandboxed parsing of model-generated markup.
- **FastAPI**: Lightweight, asynchronous REST API with automatic OpenAPI documentation and strict Pydantic type safety.
- **Next.js & Tailwind CSS**: Professional educational UI with responsive cards, SVG preview modal, interactive badges with tooltips, and instant static bundle loading.
- **Separation of Concerns**: The frontend never has access to the Gemini API key; all AI interactions and validations occur securely on the backend.

---

## 5. The 5 Automated Code Checks

Every SVG generated by the model must pass 5 rigorous code checks in `backend/validator.py`:

### Check 1: Valid SVG XML Parser
- Uses `defusedxml.minidom` to parse the markup.
- Verifies XML is well-formed without unclosed tags or syntax errors.
- Confirms the root element is `<svg>` and has a valid `viewBox` attribute (`minX minY width height`).

### Check 2: True Geometric ViewBox Boundary Validation
Rather than checking basic $(x, y)$ coordinates, the validator calculates spatial bounding geometry across all primitives:
- **`<circle>`**: $[cx - (r + \frac{sw}{2}), cx + (r + \frac{sw}{2})] \subseteq [0, 800]$ and $[cy - (r + \frac{sw}{2}), cy + (r + \frac{sw}{2})] \subseteq [0, 500]$.
- **`<rect>`**: $[x - \frac{sw}{2}, x + w + \frac{sw}{2}] \subseteq [0, 800]$ and $[y - \frac{sw}{2}, y + h + \frac{sw}{2}] \subseteq [0, 500]$.
- **`<ellipse>`**: $[cx \pm (rx + \frac{sw}{2})] \subseteq [0, 800]$ and $[cy \pm (ry + \frac{sw}{2})] \subseteq [0, 500]$.
- **`<line>`**: Endpoints $(x1, y1)$ and $(x2, y2)$ within bounds.
- **`<polygon>` / `<polyline>`**: Parses every coordinate pair in the `points` attribute to ensure all vertices lie within $[0, 800] \times [0, 500]$.
- **`<text>`**: Inspects anchor position, font size, and text extent (`length * font_size * 0.6`), accounting for `text-anchor="start"`, `"middle"`, or `"end"`.
- **`<path>`**: Verifies numeric coordinates do not explode outside the viewBox.

### Check 3: Title and Visible Text Labels
- Verifies the presence of a non-empty `<title>` element (or prominent title heading).
- Verifies at least 3 distinct, non-empty `<text>` labels that are not hidden via `display="none"` or `visibility="hidden"`.

### Check 4: Animation Presence
- Detects SMIL animation elements (`<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`).
- OR detects CSS animations: `<style>` containing `@keyframes` and valid `animation:` rules.

### Check 5: Concept-Specific Scientific & Structural Correctness
Enforces deterministic structural rules tailored to each GCSE syllabus topic:
- **Pythagoras**: Verifies right-angled triangle polygon/path, side labels, hypotenuse identified as the longest side, and formula $a^2 + b^2 = c^2$.
- **Parts of a Circle**: Verifies `<circle>` shape, centre dot/coordinates, radius line, diameter line crossing centre with length $\approx 2r$, and circumference perimeter ring.
- **Series Circuit**: Verifies single closed wire loop, battery/cell polarity ($+$ and $-$), two series components (lamps/resistors), and current flow indicators.
- **Photosynthesis**: Verifies green leaf/chloroplast representation, light energy/sunlight inputs, chemical inputs ($\text{CO}_2, \text{H}_2\text{O}$), and chemical outputs ($\text{glucose}, \text{O}_2$).
- **States of Matter**: Verifies 3 distinct containers with solid, liquid, gas labels, containing $\ge 10$ particle circles arranged according to physical state (solid tightly packed in grid, liquid close but irregular, gas widely separated).

---

## 6. Two Independent Retry Systems

The application separates validation retries from API error retries:

### A. Validation Self-Correction Retry (1 Max)
1. If any of the 5 checks fail on Attempt 1, the failure reasons are compiled into a structured prompt:
   ```
   CRITICAL CORRECTION REQUIRED:
   Your previous SVG failed validation with these issues:
   - viewbox_bounds: <circle> extends past viewBox maxX (800)
   - title_and_labels: Found 2 text labels (minimum 3 required)
   Please correct these specific issues and return a complete, valid SVG.
   ```
2. Gemini receives this feedback and attempts generation a second time.
3. The new SVG is re-validated. The system stops after Attempt 2, logging `validation_retries: 1` and recording whether it passed or failed.

### B. API Rate Limit & Transient Error Retry (3 Max)
- On HTTP `429` (Too Many Requests / Quota Exceeded) or `503` (Service Unavailable / Overloaded):
- Exponential backoff is applied:
  - Attempt 1: wait 2.0s
  - Attempt 2: wait 4.0s
  - Attempt 3: wait 8.0s
- Permanent errors (e.g. invalid API key) fail immediately without wasteful retries.
- `api_retries` is tracked independently from `validation_retries`.

---

## 7. Token Usage & Cost Calculation

Gemini API returns exact token counts in `usage_metadata`:
- `prompt_tokens` (input)
- `candidates_tokens` (output)
- `total_tokens`

### Pricing Formula
Configurable via `.env`:
- `INPUT_PRICE_PER_MILLION = $0.075`
- `OUTPUT_PRICE_PER_MILLION = $0.300`

$$\text{Estimated Cost (USD)} = \left(\frac{\text{Input Tokens}}{1,000,000} \times 0.075\right) + \left(\frac{\text{Output Tokens}}{1,000,000} \times 0.300\right)$$

- **Free-Tier Economic Distinction**: On the free tier, `actual_cost_usd` is recorded as `$0.000000`, while `estimated_cost_usd` records the commercial API equivalent.

---

## 8. Reviewer Decision Storage: Why `localStorage`?

Every row in the dashboard provides **Approve** and **Reject** buttons along with an editable reviewer note box.

### Architectural Rationale:
- **Zero Configuration & Zero Friction**: Decisions persist across page refreshes and browser restarts immediately.
- **Isolated Reviewer Sessions**: When hosted on a public demo link (e.g. Vercel), `localStorage` ensures that multiple concurrent reviewers do not overwrite or interfere with each other's decisions.
- **Decoupled from Database Infrastructure**: Introducing PostgreSQL or SQLite for a small 5-concept evaluation would add operational fragility without providing additional value for an interview review.
- **Full Offline Resilience**: Decisions survive network drops or backend downtime.

---

## 9. Running Locally

### Prerequisites
- Node.js v18+ (tested on v22.17.1)
- Python 3.10+ (tested on Python 3.12.5)
- Git

### 1. Clone & Setup
```bash
git clone <your-repo-url>
cd UDHI-TECHNOLOGIES
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Edit `.env` and add your free Google AI Studio key:
```ini
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Backend Setup
```bash
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend unit tests (21 tests)
PYTHONPATH=. pytest tests/ -v

# Start FastAPI backend server (port 8000)
python -m uvicorn backend.main:app --reload --port 8000
```

### 4. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. All 5 diagrams load immediately.

---

## 10. Post-Mortem: What Failed and How It Was Fixed

1. **Geometric Boundary Math vs. Center-Only Coordinates**:
   - *Problem*: An early naive check only checked whether an element's $(x, y)$ coordinate was positive. A circle with center $(790, 250)$ and radius $30$ has its center inside the 800px width, but its right edge reaches $790 + 30 = 820\text{px}$, spilling outside the viewBox.
   - *Fix*: Implemented strict geometric bounds checking in `backend/validator.py`: calculating $(cx \pm r \pm \frac{sw}{2})$ for circles, $(x + w + \frac{sw}{2})$ for rectangles, and parsing vertex points for polygons and polylines.

2. **Text Anchor Alignment in SVG Bounding Box**:
   - *Problem*: In the States of Matter diagram, `<text x="630" y="425">Move fast in all directions</text>` failed the boundary check because the validator assumed left-aligned text (`text-anchor="start"`), calculating a right extent of $856\text{px}$. However, the diagram intended the text to be centered.
   - *Fix*: Enhanced the validator to inspect both the `text-anchor` XML attribute and inline `style="text-anchor: middle"`. When `text-anchor="middle"` is present, the bounding box is computed symmetrically as $[x - \frac{W}{2}, x + \frac{W}{2}]$, which fits within the viewBox.

3. **Next.js Font Fetching in Offline/Sandbox Environments**:
   - *Problem*: Next.js 16 defaults to `next/font/google`, which attempted to download the `Geist` font from `fonts.googleapis.com` during the production build, failing when network access was restricted.
   - *Fix*: Replaced Google web font requests with high-performance system typography (`system-ui, -apple-system, BlinkMacSystemFont, sans-serif`) in `layout.tsx`, making the build 100% self-contained and reproducible.

4. **Turbopack Experimental Loader**:
   - *Problem*: Next.js 16 with `@tailwindcss/turbopack` spawned an internal node worker process that exited prematurely during CSS parsing.
   - *Fix*: Configured standard `@tailwindcss/postcss` with `postcss.config.mjs` and clean `next.config.ts`, ensuring builds compile in under 2 seconds.

---

## 11. What I Would Do With One More Day
1. **SVG to Video (MP4/WebM) Rendering Pipeline**:
   - Integrate `puppeteer` or `ffmpeg` with SVG canvas capture to export animated SVGs directly into 1080p lesson video clips for GCSE student distribution.
2. **Playwright Visual Regression Testing**:
   - Add automated visual snapshot tests comparing generated SVGs against textbook reference illustrations to catch visual clipping or overlapping labels that pass DOM checks.
3. **Multi-Reviewer Cloud Database Sync**:
   - Add Supabase or PostgreSQL storage alongside `localStorage` so a team of curriculum editors can collaborate, comment in threads, and view revision histories.
4. **Interactive SVG Exploration**:
   - Add interactive student controls to the diagrams (e.g. slider to change resistance in the series circuit and see electron flow speed change, or temperature slider for states of matter).

---

## 12. AI Tools Used
- **Antigravity (Google DeepMind)**: Full-stack agent used for project scaffolding, architectural planning, test-driven validation engine authoring, and build optimization.
- **Google Gemini 2.5 Flash**: LLM used for generating the educational animated SVG diagrams and self-correcting markup based on automated code feedback.
- **Python DefusedXML**: Security library used to safely parse and sanitize model-generated XML against entity expansion and XSS vulnerabilities.

---

## 13. Interview Walkthrough Guide

Be prepared to explain:
1. **Why Gemini Flash?** Free-tier accessibility, fast generation speeds (< 2s), and excellent SMIL/CSS SVG markup generation capabilities.
2. **Why SVG?** Vector resolution independence, tiny payload size (~2KB vs ~2MB video), and native CSS keyframe and SMIL animatability.
3. **How does boundary checking work?** Walk through `backend/validator.py` lines 120–220 showing the mathematical boundary formulas for each SVG primitive.
4. **How are infinite loops prevented?** Validation retries are strictly capped at 1 attempt (`validation_retries <= 1`), while transient API errors are capped at 3 attempts with exponential backoff.
5. **Live Change Readiness**: If asked to add a new check (e.g. check for minimum contrast or specific color palette), simply add a new helper in `backend/validator.py` and call it in `validate_svg()`.
