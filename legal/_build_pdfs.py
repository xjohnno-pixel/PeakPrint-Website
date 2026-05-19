"""Convert the three legal markdown drafts into Peak Framed-branded PDFs.

Usage: python3 legal/_build_pdfs.py

Pipeline:
  .md → HTML (markdown lib) → wrap in styled template → Chrome headless --print-to-pdf

Outputs: legal/<name>.pdf for each .md in legal/.
"""
import os
import subprocess
import tempfile
from pathlib import Path

import markdown

LEGAL_DIR = Path(__file__).parent
DOCS = [
    ("privacy-policy.md", "Privacy Policy"),
    ("terms-of-service.md", "Terms of Service"),
    ("shipping-and-returns.md", "Shipping & Returns Policy"),
]

CSS = """
  @page { size: A4; margin: 22mm 18mm 22mm 18mm; }
  .page-break { page-break-before: always; }
  .cover {
    text-align: center;
    padding-top: 120px;
  }
  .cover .name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 42pt;
    font-weight: 600;
    color: #0a1118;
    letter-spacing: -0.02em;
    margin: 0;
  }
  .cover .tagline {
    font-size: 11pt;
    color: #6b7785;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-top: 10px;
  }
  .cover .accent-rule {
    width: 60px;
    height: 2px;
    background: #c4956a;
    margin: 36px auto;
  }
  .cover .doctitle {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22pt;
    font-weight: 500;
    color: #1a2533;
    margin: 0;
  }
  .cover .meta {
    font-size: 10pt;
    color: #6b7785;
    margin-top: 18px;
    line-height: 1.7;
  }
  .toc {
    margin-top: 24px;
  }
  .toc h2 {
    margin-top: 0;
  }
  .toc ol {
    list-style: none;
    counter-reset: toc;
    padding-left: 0;
    font-size: 11pt;
  }
  .toc ol > li {
    counter-increment: toc;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px dotted #d4d4d4;
  }
  .toc ol > li::before {
    content: counter(toc, decimal-leading-zero) "  ";
    color: #c4956a;
    font-weight: 700;
    font-family: 'Playfair Display', Georgia, serif;
  }
  .toc .toc-title {
    font-weight: 600;
    color: #0a1118;
    font-size: 12pt;
  }
  .toc .toc-note {
    display: block;
    font-size: 9.5pt;
    color: #6b7785;
    margin-top: 3px;
    margin-left: 30px;
  }
  .doc-section-header {
    margin-bottom: 26px;
    padding-bottom: 14px;
    border-bottom: 2px solid #c4956a;
  }
  .doc-section-header .eyebrow {
    font-size: 8.5pt;
    color: #c4956a;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    color: #1a2533;
    line-height: 1.55;
    font-size: 10.5pt;
    margin: 0;
  }
  .brand {
    border-bottom: 2px solid #c4956a;
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .brand .name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22pt;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #0a1118;
    margin: 0;
  }
  .brand .tagline {
    font-size: 9pt;
    color: #6b7785;
    margin-top: 4px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 18pt;
    font-weight: 600;
    color: #0a1118;
    margin: 0 0 18px;
    letter-spacing: -0.01em;
  }
  h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 13pt;
    font-weight: 600;
    color: #0a1118;
    margin: 22px 0 8px;
  }
  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #1a2533;
    margin: 16px 0 6px;
  }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  strong { color: #0a1118; }
  blockquote {
    border-left: 3px solid #c4956a;
    background: #faf6f1;
    padding: 12px 16px;
    margin: 0 0 18px;
    color: #5a6470;
    font-size: 9.5pt;
    border-radius: 2px;
  }
  blockquote p:last-child { margin-bottom: 0; }
  hr { border: 0; border-top: 1px solid #e2e2e2; margin: 22px 0; }
  a { color: #c4956a; text-decoration: none; }
  .footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px solid #e2e2e2;
    font-size: 8.5pt;
    color: #6b7785;
    text-align: center;
  }
"""

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title} — Peak Framed</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body>
  <div class="brand">
    <div class="name">Peak Framed</div>
    <div class="tagline">Your Adventure. Framed.</div>
  </div>
  {body}
  <div class="footer">
    Peak Framed · ABN 23 937 267 604 · hello@peakframed.com.au · peakframed.com.au
  </div>
</body>
</html>
"""

CHROME_PATHS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
]


def find_chrome() -> str:
    for p in CHROME_PATHS:
        if os.path.exists(p):
            return p
    raise RuntimeError("No Chrome/Chromium/Edge binary found on this machine.")


def md_to_pdf(md_path: Path, title: str, chrome: str) -> Path:
    md_text = md_path.read_text(encoding="utf-8")
    html_body = markdown.markdown(md_text, extensions=["extra", "sane_lists"])
    html = HTML_TEMPLATE.format(title=title, css=CSS, body=html_body)

    with tempfile.NamedTemporaryFile(
        "w", suffix=".html", delete=False, encoding="utf-8"
    ) as f:
        f.write(html)
        html_path = f.name

    pdf_path = md_path.with_suffix(".pdf")
    subprocess.run(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--no-margins",
            f"--print-to-pdf={pdf_path}",
            f"file://{html_path}",
        ],
        check=True,
        capture_output=True,
    )
    os.unlink(html_path)
    return pdf_path


COMBINED_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Peak Framed — Legal Policies</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body>
  <div class="cover">
    <div class="name">Peak Framed</div>
    <div class="tagline">Your Adventure. Framed.</div>
    <div class="accent-rule"></div>
    <div class="doctitle">Legal Policies</div>
    <div class="meta">
      Privacy Policy · Terms of Service · Shipping &amp; Returns<br>
      Version 1.3 · Last updated 19 May 2026<br>
      ABN 23 937 267 604
    </div>
  </div>

  <div class="page-break toc">
    <h1>Contents</h1>
    <ol>
      {toc_items}
    </ol>
  </div>

  {sections}

  <div class="footer">
    Peak Framed · ABN 23 937 267 604 · hello@peakframed.com.au · peakframed.com.au
  </div>
</body>
</html>
"""


def build_combined(chrome: str) -> Path:
    """Single PDF with cover, table of contents, and all three docs."""
    toc_items = []
    sections_html = []

    for i, (fname, title) in enumerate(DOCS):
        md_path = LEGAL_DIR / fname
        if not md_path.exists():
            print(f"SKIP (missing): {md_path}")
            continue

        body_html = markdown.markdown(
            md_path.read_text(encoding="utf-8"),
            extensions=["extra", "sane_lists"],
        )
        # Strip the per-doc <h1> since the section header below replaces it.
        body_html = body_html.split("</h1>", 1)[1] if "</h1>" in body_html else body_html

        toc_items.append(
            f'<li><span class="toc-title">{title}</span>'
            f'<span class="toc-note">{md_path.stem}.pdf — also available as a standalone document</span></li>'
        )

        sections_html.append(
            f'<div class="page-break"><div class="doc-section-header">'
            f'<div class="eyebrow">Document {i + 1} of {len(DOCS)}</div>'
            f'<h1>{title}</h1></div>{body_html}</div>'
        )

    html = COMBINED_TEMPLATE.format(
        css=CSS,
        toc_items="\n      ".join(toc_items),
        sections="\n".join(sections_html),
    )

    with tempfile.NamedTemporaryFile(
        "w", suffix=".html", delete=False, encoding="utf-8"
    ) as f:
        f.write(html)
        html_path = f.name

    pdf_path = LEGAL_DIR / "peakframed-legal-pack.pdf"
    subprocess.run(
        [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--no-margins",
            f"--print-to-pdf={pdf_path}",
            f"file://{html_path}",
        ],
        check=True,
        capture_output=True,
    )
    os.unlink(html_path)
    return pdf_path


def build_html(md_path: Path) -> Path:
    """Convert .md → paste-ready HTML for Shopify's policy editor.

    Output is body-only HTML (no <html>/<head>) — Shopify wraps it
    automatically. The disclaimer banner and version stamp are stripped
    so policies look professional when pasted into Settings → Policies.
    """
    md_text = md_path.read_text(encoding="utf-8")
    # Strip the DRAFT disclaimer blockquote (first > ... block)
    md_text = "\n".join(
        line for line in md_text.split("\n") if not line.startswith("> **DRAFT")
    )
    # Strip the version/effective/last-updated metadata block at the top
    md_text = "\n".join(
        line for line in md_text.split("\n")
        if not (line.startswith("**Version:**") or line.startswith("**Effective date:**") or line.startswith("**Last updated:**"))
    )
    html_body = markdown.markdown(md_text, extensions=["extra", "sane_lists"])
    out = md_path.with_suffix(".html")
    out.write_text(html_body + "\n", encoding="utf-8")
    return out


def main() -> None:
    chrome = find_chrome()

    print("Paste-ready HTML (for Shopify Settings → Policies):")
    for fname, _title in DOCS:
        md_path = LEGAL_DIR / fname
        if not md_path.exists():
            print(f"  SKIP (missing): {md_path}")
            continue
        html_path = build_html(md_path)
        size_kb = html_path.stat().st_size / 1024
        print(f"  {html_path.name}  ({size_kb:.1f} KB)")

    print("\nPer-document PDFs:")
    for fname, title in DOCS:
        md_path = LEGAL_DIR / fname
        if not md_path.exists():
            print(f"  SKIP (missing): {md_path}")
            continue
        pdf_path = md_to_pdf(md_path, title, chrome)
        size_kb = pdf_path.stat().st_size / 1024
        print(f"  {pdf_path.name}  ({size_kb:.0f} KB)")

    print("\nCombined pack:")
    combined = build_combined(chrome)
    size_kb = combined.stat().st_size / 1024
    print(f"  {combined.name}  ({size_kb:.0f} KB)")

    print("\nDone.")


if __name__ == "__main__":
    main()
