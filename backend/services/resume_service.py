import re
import shutil
import subprocess
import tempfile
from pathlib import Path

RESUMES_DIR = Path(__file__).parent.parent.parent / "resumes"
BASE_DIR = RESUMES_DIR / "base"
TAILORED_DIR = RESUMES_DIR / "tailored"


class LatexCompileError(Exception):
    pass


def check_tools() -> dict[str, bool]:
    return {
        "pandoc": shutil.which("pandoc") is not None,
        "pdflatex": shutil.which("pdflatex") is not None,
    }


def sanitize_latex(latex: str) -> str:
    """Replace pandoc preamble packages unavailable in BasicTeX with safe equivalents."""
    # soul.sty not in BasicTeX; ulem provides the same \ul command and IS available
    latex = re.sub(
        r"\\ifLuaTeX\s*\\usepackage\{luacolor\}\s*\\usepackage\[soul\]\{lua-ul\}\s*"
        r"\\else\s*\\usepackage\{soul\}\s*\\fi",
        r"\\usepackage[normalem]{ulem}",
        latex,
        flags=re.DOTALL,
    )
    # xurl.sty not in BasicTeX; already guarded by \IfFileExists in pandoc output
    # but Claude sometimes drops the guard — make it safe
    latex = re.sub(
        r"\\usepackage\{xurl\}",
        r"\\IfFileExists{xurl.sty}{\\usepackage{xurl}}{}",
        latex,
    )
    return latex


async def convert_docx_to_latex(docx_path: str) -> str:
    tools = check_tools()
    if tools["pandoc"]:
        with tempfile.NamedTemporaryFile(suffix=".tex", delete=False) as tmp:
            tex_path = tmp.name
        result = subprocess.run(
            ["pandoc", docx_path, "-o", tex_path, "--standalone"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            content = sanitize_latex(Path(tex_path).read_text())
            Path(tex_path).unlink(missing_ok=True)
            return content
        Path(tex_path).unlink(missing_ok=True)

    # fallback: python-docx plain text wrapped in minimal LaTeX
    try:
        from docx import Document
        doc = Document(docx_path)
        lines = [para.text for para in doc.paragraphs]
        text = "\n".join(lines)
        return _wrap_plain_in_latex(text)
    except Exception as e:
        raise RuntimeError(f"Could not convert DOCX: {e}")


def _wrap_plain_in_latex(text: str) -> str:
    escaped = text.replace("&", r"\&").replace("%", r"\%").replace("$", r"\$").replace("#", r"\#")
    return (
        r"\documentclass{article}" + "\n"
        r"\begin{document}" + "\n"
        + escaped + "\n"
        r"\end{document}"
    )


def save_base_latex(latex_source: str) -> str:
    BASE_DIR.mkdir(parents=True, exist_ok=True)
    tex_path = BASE_DIR / "resume.tex"
    tex_path.write_text(latex_source)
    return str(tex_path)


def get_base_latex() -> str | None:
    tex_path = BASE_DIR / "resume.tex"
    if tex_path.exists():
        return tex_path.read_text()
    return None


def save_tailored_latex(job_id: int, latex_source: str) -> str:
    TAILORED_DIR.mkdir(parents=True, exist_ok=True)
    tex_path = TAILORED_DIR / f"{job_id}.tex"
    tex_path.write_text(sanitize_latex(latex_source))
    return str(tex_path)


def compile_latex(tex_path: str) -> str:
    tex_file = Path(tex_path)
    out_dir = tex_file.parent

    def run_pdflatex():
        return subprocess.run(
            [
                "pdflatex",
                "-interaction=nonstopmode",
                f"-output-directory={out_dir}",
                str(tex_file),
            ],
            capture_output=True,
            timeout=60,
            cwd=str(out_dir),
        )

    run_pdflatex()
    result = run_pdflatex()  # run twice for cross-references

    pdf_path = out_dir / tex_file.with_suffix(".pdf").name
    if not pdf_path.exists():
        log_path = out_dir / tex_file.with_suffix(".log").name
        error_msg = "pdflatex failed"
        if log_path.exists():
            log = log_path.read_text()
            errors = [line for line in log.splitlines() if line.startswith("!")]
            if errors:
                error_msg = "\n".join(errors[:5])
        raise LatexCompileError(error_msg)

    # clean aux files
    for ext in [".aux", ".log", ".out"]:
        aux = out_dir / tex_file.with_suffix(ext).name
        aux.unlink(missing_ok=True)

    return str(pdf_path)


def get_tailored_pdf_path(job_id: int) -> str | None:
    pdf = TAILORED_DIR / f"{job_id}.pdf"
    return str(pdf) if pdf.exists() else None
