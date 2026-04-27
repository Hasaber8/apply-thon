import asyncio
import re
import subprocess


class ClaudeError(Exception):
    pass


def _strip_fences(text: str) -> str:
    text = text.strip()
    fence_match = re.match(r"^```(?:latex|tex)?\s*\n(.*?)\n```\s*$", text, re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()
    # strip any leading prose before \documentclass
    doc_match = re.search(r"(\\documentclass)", text)
    if doc_match:
        return text[doc_match.start():]
    return text


async def call_claude(prompt: str, timeout: int = 120) -> str:
    result = await asyncio.to_thread(
        subprocess.run,
        ["claude", "-p", prompt],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise ClaudeError(result.stderr or "Claude CLI returned non-zero exit code")
    return result.stdout.strip()


def latex_to_text(latex: str) -> str:
    text = re.sub(r"\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?", " ", latex)
    text = re.sub(r"[{}\\]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


TAILOR_RESUME_PROMPT = """\
You are an expert resume writer. Tailor the following LaTeX resume for the job posting below.

STRICT RULES:
1. Return ONLY valid LaTeX source code. No explanation, no markdown, no code fences.
2. Never fabricate experience, skills, or accomplishments. Only reorder, rephrase, and emphasize existing content.
3. Mirror keywords and phrases from the job description naturally within existing bullet points.
4. Prioritize the 3-4 most relevant experiences for this role by reordering bullet points.
5. Keep the EXACT same LaTeX preamble (\\documentclass, \\usepackage lines, custom command definitions).
6. Keep all custom commands: \\rsection, \\entryrow, \\rolerow, \\rlist — do NOT replace them with standard LaTeX.
7. If the original resume is one page, keep it one page.

JOB DETAILS:
Company: {company}
Title: {title}

JOB DESCRIPTION:
{jd_text}

BASE LATEX RESUME:
{base_latex}

Return the tailored LaTeX source now:"""


COVER_LETTER_PROMPT = """\
You are an expert career coach. Write a cover letter for the job application below.

TONE: {tone}

RULES:
1. Return ONLY the plain-text cover letter body. No subject line, no markdown, no explanation.
2. Three paragraphs: (1) hook + specific interest in this role/company, (2) top 2 relevant accomplishments from the candidate's background, (3) forward-looking close.
3. Under 350 words.
4. Never use generic filler like "I am writing to express my interest."
5. Extract specific details from the JD (tech stack, team mission, product) to show genuine interest.

COMPANY: {company}
ROLE: {title}

JOB DESCRIPTION:
{jd_text}

CANDIDATE BACKGROUND (from resume):
{resume_summary}

Write the cover letter now:"""


COLD_EMAIL_PROMPT = """\
You are an expert at writing concise, compelling cold outreach emails for job seekers.

RULES:
1. Return ONLY the email body. No subject line, no "From:", no markdown.
2. Maximum 150 words. Shorter is better.
3. Opening line must be specific to the company — reference their product, recent work, or mission.
4. One sentence on the candidate's single most relevant experience.
5. One specific ask: a 20-minute call.
6. Never say "I came across your job posting." Write as if this is organic outreach.

COMPANY: {company}
ROLE THEY ARE HIRING FOR: {title}
CONTACT: {contact}

JOB DESCRIPTION (for context):
{jd_text}

CANDIDATE BACKGROUND:
{resume_summary}

Write the cold email body now:"""


async def tailor_resume(base_latex: str, jd_text: str, company: str, title: str) -> str:
    prompt = TAILOR_RESUME_PROMPT.format(
        company=company,
        title=title,
        jd_text=jd_text[:6000],
        base_latex=base_latex,
    )
    result = await call_claude(prompt)
    result = _strip_fences(result)
    if "\\begin{document}" not in result:
        result = await call_claude(prompt)
        result = _strip_fences(result)
    if "\\begin{document}" not in result:
        raise ClaudeError("Claude did not return valid LaTeX after two attempts")
    return result


async def generate_cover_letter(
    jd_text: str, company: str, title: str, base_latex: str, tone: str = "professional"
) -> str:
    summary = latex_to_text(base_latex)[:3000]
    prompt = COVER_LETTER_PROMPT.format(
        tone=tone,
        company=company,
        title=title,
        jd_text=jd_text[:4000],
        resume_summary=summary,
    )
    return await call_claude(prompt)


async def generate_cold_email(
    jd_text: str, company: str, title: str, base_latex: str, contact_name: str | None = None
) -> str:
    summary = latex_to_text(base_latex)[:2000]
    prompt = COLD_EMAIL_PROMPT.format(
        company=company,
        title=title,
        contact=contact_name or "Hiring Manager",
        jd_text=jd_text[:3000],
        resume_summary=summary,
    )
    return await call_claude(prompt)
