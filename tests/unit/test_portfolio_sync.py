# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Synchronization tests ensuring portfolio data matches https://enriquekchan.web.app."""

import json
from pathlib import Path
import re

from agent.portfolio_data import (
    ANALYST_RELATIONS,
    AWARDS,
    BLOGS,
    CERTIFICATION_GROUPS,
    CERTIFICATIONS,
    COMICS,
    EXPERIENCE,
    GALLERY,
    PROFILE,
    PROJECTS,
    REPOSITORIES,
    SPEAKING,
    TESTIMONIALS,
    VIDEOS,
)

ROOT_DIR = Path(__file__).resolve().parents[2]
AGENT_JSON_PATH = ROOT_DIR / "agent" / "portfolio_data.json"
FRONTEND_JSON_PATH = ROOT_DIR / "src" / "portfolio-data.json"


def test_agent_and_frontend_portfolio_json_are_identical() -> None:
    """Ensure agent/portfolio_data.json and src/portfolio-data.json are in sync."""
    assert AGENT_JSON_PATH.exists(), "agent/portfolio_data.json is missing"
    assert FRONTEND_JSON_PATH.exists(), "src/portfolio-data.json is missing"

    agent_data = json.loads(AGENT_JSON_PATH.read_text(encoding="utf-8"))
    frontend_data = json.loads(FRONTEND_JSON_PATH.read_text(encoding="utf-8"))
    assert agent_data == frontend_data, (
        "agent/portfolio_data.json and src/portfolio-data.json are out of sync!"
    )


def test_2026_profile_and_analyst_relations_synced() -> None:
    """Verify 2026 Staff TDL role, SWIFTY banner news, and 4x Analyst Leader wins."""
    assert "Staff AI Technical Deployment Lead" in PROFILE["role"]
    assert "Google Cloud Delta" in PROFILE["role"]
    assert "Outbound Product Manager" in PROFILE["role"]
    assert PROFILE["links"]["portfolio"] == "https://enriquekchan.web.app"

    assert len(ANALYST_RELATIONS) == 4
    reports = " ".join(item["title"] for item in ANALYST_RELATIONS)
    assert "Enterprise AI Assistants" in reports
    assert "Cloud-Native Application Platforms" in reports
    assert "Forrester Wave" in reports
    assert "AI Application Development Platforms" in reports


def test_2026_experience_projects_and_awards_synced() -> None:
    """Verify 2026 experience, projects, and awards are present and complete."""
    assert len(EXPERIENCE) >= 7
    assert "Google Cloud Delta" in EXPERIENCE[0]["company"]
    for exp in EXPERIENCE:
        assert exp.get("description"), f"Missing description in {exp}"
        assert exp.get("impact"), f"Missing impact in {exp}"

    project_titles = [p["title"] for p in PROJECTS]
    for expected in [
        "SafeKids Portal",
        "Economic Research Agent (Agent Garden)",
        "AgentOps Cockpit",
        "Curious Little Minds (Lily & Robo Story Agent)",
        "NBC Olympic Concierge",
        "Advent of Agents",
    ]:
        assert any(expected in t for t in project_titles), f"Missing project: {expected}"

    award_titles = " ".join(a["title"] for a in AWARDS)
    assert "SWIFTY" in award_titles
    assert "Gartner" in award_titles


def test_no_mock_youtube_urls_and_all_ui_fields_populated() -> None:
    """Ensure all YouTube video IDs are valid and UI card fields are populated."""
    yt_regex = re.compile(r"^[A-Za-z0-9_-]{11}$")
    for video in VIDEOS:
        url = video.get("url", "")
        assert "Why-Agents-Fail" not in url, f"Found mocked video URL: {url}"
        vid = video.get("id", "")
        assert yt_regex.match(vid), f"Invalid YouTube ID: {vid}"

    assert len(SPEAKING) >= 8
    for s in SPEAKING:
        assert s.get("description"), f"Missing description in speaking item: {s}"

    assert len(CERTIFICATIONS) >= 8
    total_grouped_certs = sum(len(g.get("certs", [])) for g in CERTIFICATION_GROUPS)
    assert total_grouped_certs >= 16
    for c in CERTIFICATIONS:
        assert c.get("description"), f"Missing description in certification item: {c}"

    assert len(BLOGS) >= 14
    assert len(TESTIMONIALS) >= 5
    assert len(COMICS) >= 5
    assert len(REPOSITORIES) >= 5
    assert len(GALLERY) >= 3
