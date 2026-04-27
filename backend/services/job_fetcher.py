import html
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup


BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.google.com/",
}


class ScrapingBlockedError(Exception):
    pass


class FetchError(Exception):
    pass


def detect_platform(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if "greenhouse.io" in host:
        return "greenhouse"
    if "ashbyhq.com" in host or "ashby.com" in host:
        return "ashby"
    if "linkedin.com" in host:
        return "linkedin"
    return "generic"


def _strip_html(content: str) -> str:
    # Greenhouse returns entity-encoded HTML (e.g. &lt;p&gt;).
    # Unescape first so BeautifulSoup sees real tags, then strip them.
    unescaped = html.unescape(content)
    soup = BeautifulSoup(unescaped, "html.parser")
    return soup.get_text(separator="\n").strip()


async def fetch_greenhouse(url: str) -> dict:
    parsed = urlparse(url)
    parts = parsed.path.strip("/").split("/")
    # boards.greenhouse.io/company/jobs/12345
    # or boards.greenhouse.io/embed/job_app?for=company&token=12345
    try:
        if "jobs" in parts:
            jobs_idx = parts.index("jobs")
            company = parts[jobs_idx - 1]
            job_id = parts[jobs_idx + 1].split("?")[0]
        else:
            raise FetchError("Cannot parse Greenhouse URL structure")
    except (ValueError, IndexError):
        raise FetchError("Cannot parse Greenhouse URL structure")

    api_url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{job_id}"
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(api_url)
        if resp.status_code != 200:
            raise FetchError(f"Greenhouse API returned {resp.status_code}")
        data = resp.json()

    jd_text = _strip_html(data.get("content", ""))
    location = data.get("location", {}).get("name") if isinstance(data.get("location"), dict) else None

    return {
        "company": company.replace("-", " ").title(),
        "title": data.get("title", "Unknown Role"),
        "jd_text": jd_text,
        "platform": "greenhouse",
        "location": location,
        "salary_range": None,
        "url": url,
    }


async def fetch_ashby(url: str) -> dict:
    parsed = urlparse(url)
    parts = parsed.path.strip("/").split("/")
    if len(parts) < 2:
        raise FetchError("Cannot parse Ashby URL structure")
    org_slug = parts[0]
    job_slug = parts[1]

    query = """
    query JobPostingBySlug($organizationHostedJobsPageName: String!, $jobSlug: String!) {
        jobPostingBySlug(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
            jobSlug: $jobSlug
        ) {
            title
            descriptionHtml
            locationName
            employmentType
            compensationTierSummary
        }
    }
    """
    payload = {
        "operationName": "JobPostingBySlug",
        "query": query,
        "variables": {
            "organizationHostedJobsPageName": org_slug,
            "jobSlug": job_slug,
        },
    }

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://jobs.ashbyhq.com/api/non-user-graphql",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            raise FetchError(f"Ashby API returned {resp.status_code}")
        data = resp.json()

    posting = (data.get("data") or {}).get("jobPostingBySlug")
    if not posting:
        raise FetchError("Job posting not found on Ashby")

    jd_text = _strip_html(posting.get("descriptionHtml", ""))
    salary = posting.get("compensationTierSummary")

    return {
        "company": org_slug.replace("-", " ").title(),
        "title": posting.get("title", "Unknown Role"),
        "jd_text": jd_text,
        "platform": "ashby",
        "location": posting.get("locationName"),
        "salary_range": salary,
        "url": url,
    }


async def fetch_linkedin(url: str) -> dict:
    async with httpx.AsyncClient(
        timeout=20, follow_redirects=True, headers=BROWSER_HEADERS
    ) as client:
        resp = await client.get(url)

    soup = BeautifulSoup(resp.text, "html.parser")

    title_tag = soup.find("title")
    title_text = title_tag.get_text() if title_tag else ""
    if "linkedin login" in title_text.lower() or "sign in" in title_text.lower():
        raise ScrapingBlockedError("LinkedIn requires login to view this job posting")

    title = ""
    company = ""

    h1 = soup.find("h1", class_=re.compile("top-card-layout__title|job-title"))
    if h1:
        title = h1.get_text(strip=True)

    company_el = soup.find(class_=re.compile("topcard__org-name|company-name"))
    if company_el:
        company = company_el.get_text(strip=True)

    jd_div = soup.find("div", class_=re.compile("show-more-less-html__markup|description__text"))
    jd_text = jd_div.get_text(separator="\n").strip() if jd_div else ""

    if not title:
        title = title_text.split("|")[0].strip() if "|" in title_text else title_text.split("-")[0].strip()

    return {
        "company": company or "Unknown Company",
        "title": title or "Unknown Role",
        "jd_text": jd_text,
        "platform": "linkedin",
        "location": None,
        "salary_range": None,
        "url": url,
    }


async def fetch_generic(url: str) -> dict:
    async with httpx.AsyncClient(
        timeout=20, follow_redirects=True, headers=BROWSER_HEADERS
    ) as client:
        resp = await client.get(url)

    soup = BeautifulSoup(resp.text, "html.parser")

    title = (
        (soup.find("meta", property="og:title") or {}).get("content")
        or (soup.find("title") or BeautifulSoup("", "html.parser")).get_text()
        or "Unknown Role"
    )

    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    body_text = soup.get_text(separator="\n")
    body_text = re.sub(r"\n{3,}", "\n\n", body_text).strip()[:8000]

    return {
        "company": "Unknown Company",
        "title": title.strip(),
        "jd_text": body_text,
        "platform": "generic",
        "location": None,
        "salary_range": None,
        "url": url,
    }


async def fetch_job_from_url(url: str) -> dict:
    platform = detect_platform(url)
    if platform == "greenhouse":
        return await fetch_greenhouse(url)
    elif platform == "ashby":
        return await fetch_ashby(url)
    elif platform == "linkedin":
        return await fetch_linkedin(url)
    else:
        return await fetch_generic(url)
