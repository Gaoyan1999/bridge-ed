from __future__ import annotations

import json
import logging
import re
from typing import Any, Iterator
from urllib.parse import quote_plus

import requests

from .config import get_bool_env, get_env
from .models import (
    ChatRespondRequest,
    ChatRespondResponse,
    EvalQuizRequest,
    KnowledgeTonightCommandResponse,
    LearningCardChildKnowledgeGenerateRequest,
    LearningCardChildKnowledgeHeroResponse,
    LearningCardChildKnowledgeResponse,
    LearningCardGenerateRequest,
    LearningCardGenerateResponse,
    StructuredQuizGenerateResponse,
    StructuredQuizQuestion,
    TranslateTextRequest,
    TranslateTextResponse,
    TranslatedSummaries,
)

# Knowledge slash command: `/make-quiz` (preferred). Legacy `/quiz` still matched for old threads.
_MATCH_MAKE_QUIZ = re.compile(r"^/?(?:make-quiz|quiz)(\b|$)", re.IGNORECASE)
_MISSING_REFERENCE_ANSWER = "[REFERENCE_ANSWER_MISSING]"
logger = logging.getLogger(__name__)


def _is_make_quiz_message(text: str) -> bool:
    return bool(_MATCH_MAKE_QUIZ.match((text or "").strip()))


def _log_preview(value: Any, limit: int = 500) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    text = text.replace("\r\n", "\n").replace("\n", "\\n")
    if len(text) > limit:
        return text[:limit] + "...[truncated]"
    return text


MOCK_CHILD_HERO_IMAGES: tuple[tuple[str, str], ...] = (
    (
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=80",
        "Art and learning",
    ),
    (
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
        "Science and discovery",
    ),
    (
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80",
        "Learning in the classroom",
    ),
)


def build_demo_draft(input_data: LearningCardGenerateRequest) -> LearningCardGenerateResponse:
    topic = input_data.topic.strip() or "this topic"
    class_title = input_data.classTitle.strip() or "this lesson"
    grade = input_data.grade.strip()
    subject = input_data.subject.strip()
    notes = input_data.notes.strip()

    note_line = (
        f"The teacher also flagged this context: {notes}."
        if notes
        else "The teacher wants families to focus on confidence and steady practice, not perfection."
    )

    en = (
        f"In {class_title}, students worked on {topic} in {subject} ({grade}). "
        f"Parents can help best by checking understanding in simple language and keeping practice short and specific. "
        f"{note_line}"
    )
    zh = (
        f"In {class_title}, students learned {topic}. "
        f"At home, the key is to review the idea in simple parent-friendly language and keep practice short and manageable. "
        f"{f'Teacher note: {notes}.' if notes else 'Focus on understanding the process rather than finishing everything in one sitting.'}"
    )
    fr = (
        f"Dans {class_title}, les eleves ont travaille sur {topic} en {subject} ({grade}). "
        f"Les familles peuvent aider en verifiant la comprehension avec des mots simples et en gardant des seances courtes. "
        f"{note_line}"
    )

    return LearningCardGenerateResponse(
        translated_summaries=TranslatedSummaries(zh=zh, en=en, fr=fr),
        actions=[
            f"Ask your child to explain {topic} in one or two sentences without reading from the worksheet.",
            "Spend 10 minutes on one example only, and focus on the first step rather than the full solution.",
            "If your child is still stuck, send the teacher the question number and the exact step that caused confusion.",
        ],
        source="demo-fallback",
    )


def extract_json_block(text: str) -> str:
    fenced_start = text.find("```json")
    if fenced_start >= 0:
        fenced_end = text.find("```", fenced_start + 7)
        if fenced_end > fenced_start:
            return text[fenced_start + 7 : fenced_end].strip()
    first = text.find("{")
    last = text.rfind("}")
    if first >= 0 and last > first:
        return text[first : last + 1]
    return text


def _coalesce_translated_from_payload(
    payload: dict[str, Any],
    fallback: LearningCardGenerateResponse,
) -> TranslatedSummaries:
    ts = payload.get("translatedSummaries")
    if isinstance(ts, dict):
        zh = str(ts.get("zh", "") or "").strip()
        en = str(ts.get("en", "") or "").strip()
        fr = str(ts.get("fr", "") or "").strip()
        return TranslatedSummaries(
            zh=zh or fallback.translated_summaries.zh,
            en=en or fallback.translated_summaries.en,
            fr=fr or fallback.translated_summaries.fr,
        )
    # Legacy keys from older prompts
    en = str(payload.get("summaryEn", "") or "").strip()
    zh = str(payload.get("summaryZh", "") or "").strip()
    fr = str(payload.get("summaryFr", "") or "").strip()
    if en or zh or fr:
        return TranslatedSummaries(
            zh=zh or fallback.translated_summaries.zh,
            en=en or fallback.translated_summaries.en,
            fr=fr or fallback.translated_summaries.fr,
        )
    return fallback.translated_summaries


def normalize_generated_draft(
    payload: dict[str, Any],
    fallback_input: LearningCardGenerateRequest,
) -> LearningCardGenerateResponse:
    fallback = build_demo_draft(fallback_input)
    actions = payload.get("actions")
    normalized_actions: list[str] = []
    if isinstance(actions, list):
        normalized_actions = [str(item).strip() for item in actions if str(item).strip()][:3]

    if len(normalized_actions) != 3:
        normalized_actions = fallback.actions

    return LearningCardGenerateResponse(
        translated_summaries=_coalesce_translated_from_payload(payload, fallback),
        actions=normalized_actions,
        source="curricullm",
    )


def build_prompt(input_data: LearningCardGenerateRequest) -> str:
    return "\n".join(
        [
            "You are CurricuLLM working for BridgeEd, a school-home communication tool.",
            "Rewrite classroom information into parent-friendly, actionable support.",
            "Audience profile:",
            "- Some parents may have limited formal education.",
            "- Some parents may feel anxious about school terms.",
            "- Write so a busy caregiver can understand quickly and act tonight.",
            "Respond with valid JSON only using this schema:",
            '{"translatedSummaries":{"zh":"string","en":"string","fr":"string"},"actions":["string","string","string"]}',
            "Requirements:",
            "- Provide complete parent-facing summary text in zh, en, and fr.",
            "- Use plain language for parents.",
            "- Keep reading level simple (short sentences, everyday words).",
            "- Avoid unexplained academic jargon.",
            "- If a school term is needed, immediately explain it in plain words.",
            "- Start by saying clearly what the child is learning this week.",
            "- Then explain why it matters in real life or homework.",
            "- End with calm, encouraging tone (no blame, no pressure language).",
            "- Keep the advice practical and realistic for busy families.",
            "- Make actions specific, short, and supportive.",
            "- Keep each summary concise (about 2-4 sentences).",
            "- Use this mini structure in each language summary:",
            "  1) What your child is learning.",
            "  2) What this means in simple words.",
            "  3) What parents can do tonight in 10-15 minutes.",
            "- Ensure actions are distinct and immediately usable at home.",
            "- Actions should be parent-ready and low-resource (paper, pencil, talk).",
            "- Prefer actions that do not require strong parent subject knowledge.",
            "- Keep actions emotionally supportive and confidence-building.",
            f"Class / lesson: {input_data.classTitle}",
            f"Grade: {input_data.grade}",
            f"Subject: {input_data.subject}",
            f"Topic: {input_data.topic}",
            f"Teacher notes: {input_data.notes}",
        ]
    )


def map_grade_to_stage(grade: str) -> str:
    normalized = grade.strip().lower()
    m = re.search(r"(\d{1,2})", normalized)
    if not m:
        return "Stage 4-5"
    year = int(m.group(1))
    if year <= 2:
        return "Stage 1"
    if year <= 4:
        return "Stage 2"
    if year <= 6:
        return "Stage 3"
    if year <= 8:
        return "Stage 4"
    if year <= 10:
        return "Stage 5"
    return "Stage 6"


def build_curriculum_context(input_data: LearningCardGenerateRequest) -> dict[str, str]:
    return {
        "stage": map_grade_to_stage(input_data.grade),
        "subject": input_data.subject.strip() or "General",
    }


def generate_with_curricullm(input_data: LearningCardGenerateRequest) -> LearningCardGenerateResponse:
    api_url = get_env("CURRICULLM_API_URL")
    api_key = get_env("CURRICULLM_API_KEY")
    model = get_env("CURRICULLM_MODEL", "CurricuLLM-AU")
    auth_header = get_env("CURRICULLM_AUTH_HEADER", "Authorization")
    auth_scheme = get_env("CURRICULLM_AUTH_SCHEME", "Bearer")

    response = requests.post(
        api_url,
        headers={
            "Content-Type": "application/json",
            auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
        },
        json={
            "model": model,
            "temperature": 0.3,
            "top_p": 0.9,
            "max_tokens": 9000,
            "response_format": {"type": "json_object"},
            "curriculum": build_curriculum_context(input_data),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You convert teacher input into parent-friendly communication aligned to school context. "
                        "Prioritize clarity for caregivers with limited formal education. "
                        "Use plain language, gentle tone, and concrete next steps. "
                        "Always return strict JSON only."
                    ),
                },
                {
                    "role": "user",
                    "content": build_prompt(input_data),
                },
            ],
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content")
        or data.get("output_text")
        or data.get("content")
        or data.get("result")
    )

    if isinstance(content, dict):
        return normalize_generated_draft(content, input_data)
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("CurricuLLM response did not contain usable content.")

    parsed = json.loads(extract_json_block(content))
    return normalize_generated_draft(parsed, input_data)


def generate_learning_card(input_data: LearningCardGenerateRequest) -> LearningCardGenerateResponse:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
    try:
        return generate_with_curricullm(input_data)
    except Exception as exc:
        if not allow_fallback:
            raise
        fallback = build_demo_draft(input_data)
        return fallback.model_copy(update={"warning": str(exc)})


def build_child_knowledge_hero(input_data: LearningCardChildKnowledgeGenerateRequest) -> LearningCardChildKnowledgeHeroResponse:
    topic = input_data.topic.strip() or "Topic"
    subject = input_data.subject.strip() or "the subject"
    grade = input_data.grade.strip() or "your grade"
    notes_keywords = _extract_notes_keywords(input_data.notes)
    notes_hint = " ".join(notes_keywords)
    q1_raw = f"{topic} basics cute animation for students {subject} {grade} {notes_hint}".strip()
    video_url = pick_first_qualified_youtube_video(
        q1_raw,
        topic=topic,
        subject=subject,
        grade=grade,
        notes_keywords=notes_keywords,
        exclude_video_ids=set(),
    )
    if video_url:
        m = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", video_url)
        if m:
            vid = m.group(1)
            return LearningCardChildKnowledgeHeroResponse(
                heroImageUrl=f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
                heroImageAlt=f"Video cover for {topic} ({subject} - {grade})",
                source="demo-fallback",
            )

    key = f"{input_data.topic}\0{input_data.subject}\0{input_data.grade}"
    h = 0
    for ch in key:
        h = (h + ord(ch)) % 2147483647
    url, alt_base = MOCK_CHILD_HERO_IMAGES[abs(h) % len(MOCK_CHILD_HERO_IMAGES)]
    return LearningCardChildKnowledgeHeroResponse(
        heroImageUrl=url,
        heroImageAlt=f"{alt_base} - {input_data.topic.strip() or 'Topic'} ({input_data.subject} - {input_data.grade})",
        source="demo-fallback",
    )


def build_child_knowledge_fallback(input_data: LearningCardChildKnowledgeGenerateRequest) -> LearningCardChildKnowledgeResponse:
    content = build_child_knowledge_safe_content(input_data)
    return LearningCardChildKnowledgeResponse(content=content, source="demo-fallback")


def _extract_intro_paragraph(raw_markdown: str) -> str:
    text = raw_markdown.strip()
    if not text:
        return ""
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    for block in blocks:
        if "http://" in block or "https://" in block:
            continue
        # Skip heading-only lines.
        if re.match(r"^#{1,6}\s+", block):
            continue
        return block
    return ""


def _extract_notes_keywords(notes: str, max_terms: int = 6) -> list[str]:
    raw = notes.strip().lower()
    if not raw:
        return []
    tokens = [t for t in re.split(r"[^a-z0-9]+", raw) if len(t) >= 3]
    stop = {
        "the", "and", "for", "with", "from", "that", "this", "your", "you", "are", "was", "were",
        "have", "has", "had", "into", "about", "what", "when", "where", "which", "will", "would",
        "could", "should", "can", "need", "using", "used", "use", "students", "student", "class",
        "lesson", "topic", "notes", "more", "less", "very", "just", "then", "than",
    }
    seen: set[str] = set()
    out: list[str] = []
    for tok in tokens:
        if tok in stop:
            continue
        if tok in seen:
            continue
        seen.add(tok)
        out.append(tok)
        if len(out) >= max_terms:
            break
    return out


def _parse_duration_seconds(text: str) -> int | None:
    s = text.strip()
    if not s:
        return None
    m = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", s)
    if not m:
        return None
    if m.group(3) is not None:
        hh = int(m.group(1))
        mm = int(m.group(2))
        ss = int(m.group(3))
        return hh * 3600 + mm * 60 + ss
    mm = int(m.group(1))
    ss = int(m.group(2))
    return mm * 60 + ss


def _extract_youtube_title(block: str) -> str:
    m = re.search(r'"title":\{"runs":\[\{"text":"([^"]+)"\}', block)
    if m:
        return m.group(1)
    m = re.search(r'"title":\{"simpleText":"([^"]+)"\}', block)
    if m:
        return m.group(1)
    return ""


def _extract_youtube_length(block: str) -> str:
    m = re.search(r'"lengthText":\{"simpleText":"([^"]+)"\}', block)
    if m:
        return m.group(1)
    m = re.search(r'"lengthText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"\}\}', block)
    if m:
        return m.group(1)
    return ""


def pick_first_qualified_youtube_video(
    query: str,
    *,
    topic: str,
    subject: str,
    grade: str,
    notes_keywords: list[str] | None = None,
    exclude_video_ids: set[str] | None = None,
) -> str | None:
    url = "https://www.youtube.com/results"
    headers = {"User-Agent": "Mozilla/5.0 (BridgeEd/1.0)"}
    try:
        resp = requests.get(
            url,
            params={"search_query": query, "hl": "en"},
            headers=headers,
            timeout=12,
        )
        resp.raise_for_status()
    except Exception:
        return None

    html = resp.text
    blocks = html.split('"videoRenderer":')
    if len(blocks) <= 1:
        return None

    topic_tokens = [t for t in re.split(r"\W+", topic.lower()) if len(t) >= 3]
    subject_tokens = [t for t in re.split(r"\W+", subject.lower()) if len(t) >= 3]
    grade_tokens = [t for t in re.split(r"\W+", grade.lower()) if t]
    key_tokens = topic_tokens[:4] + subject_tokens[:2] + grade_tokens[:1]
    note_tokens = [(t or "").lower() for t in (notes_keywords or []) if t]
    preferred_tokens = {"cute", "animation", "animated", "kids", "student", "cartoon"}

    best_score = -999
    best_video_id: str | None = None
    seen: set[str] = set()

    excluded = exclude_video_ids or set()

    for raw in blocks[1:40]:
        block = raw[:5000]
        id_m = re.search(r'"videoId":"([A-Za-z0-9_-]{11})"', block)
        if not id_m:
            continue
        video_id = id_m.group(1)
        if video_id in excluded:
            continue
        if video_id in seen:
            continue
        seen.add(video_id)

        lower = block.lower()
        if '"islivenow":true' in lower or '"style":"live"' in lower:
            continue
        if '"style":"shorts"' in lower:
            continue
        if '"reelitemrenderer"' in lower:
            continue

        title = _extract_youtube_title(block)
        title_lower = title.lower()
        length_raw = _extract_youtube_length(block)
        duration = _parse_duration_seconds(length_raw)

        score = 0
        if duration is not None:
            # hard filter: skip overlong videos
            if duration > 1200:
                continue
            if 180 <= duration <= 1200:
                score += 3
            elif duration < 90:
                score -= 2
        else:
            score -= 1

        token_hits = sum(1 for tok in key_tokens if tok and tok in title_lower)
        score += token_hits
        note_hits = sum(1 for tok in note_tokens if tok and tok in title_lower)
        score += note_hits * 2
        if any(tok in title_lower for tok in preferred_tokens):
            score += 2
        if "for kids" in title_lower or "beginner" in title_lower:
            score += 1
        if "cute" in title_lower and ("animation" in title_lower or "animated" in title_lower):
            score += 2
        if "trailer" in title_lower or "reaction" in title_lower or "meme" in title_lower:
            score -= 4
        if "shorts" in title_lower or "#shorts" in title_lower:
            score -= 5

        if score > best_score:
            best_score = score
            best_video_id = video_id

    if not best_video_id:
        return None
    return f"https://www.youtube.com/watch?v={best_video_id}"


def build_child_knowledge_safe_content(
    input_data: LearningCardChildKnowledgeGenerateRequest,
    intro_override: str | None = None,
) -> str:
    topic = input_data.topic.strip() or "this topic"
    subject = input_data.subject.strip() or "the subject"
    grade = input_data.grade.strip() or "your grade"

    notes_keywords = _extract_notes_keywords(input_data.notes)
    notes_hint = " ".join(notes_keywords)

    q1_raw = f"{topic} basics cute animation for students {subject} {grade} {notes_hint}".strip()
    q2_raw = f"{topic} worked examples animated lesson {subject} {grade} {notes_hint}".strip()
    q3_raw = f"{topic} practice questions cute animation {subject} {grade} {notes_hint}".strip()
    q1 = quote_plus(q1_raw)
    q2 = quote_plus(q2_raw)
    q3 = quote_plus(q3_raw)

    used_ids: set[str] = set()

    def _video_id_from_url(url: str | None) -> str | None:
        if not url:
            return None
        m = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", url)
        return m.group(1) if m else None

    v1 = pick_first_qualified_youtube_video(
        q1_raw,
        topic=topic,
        subject=subject,
        grade=grade,
        notes_keywords=notes_keywords,
        exclude_video_ids=used_ids,
    )
    id1 = _video_id_from_url(v1)
    if id1:
        used_ids.add(id1)

    v2 = pick_first_qualified_youtube_video(
        q2_raw,
        topic=topic,
        subject=subject,
        grade=grade,
        notes_keywords=notes_keywords,
        exclude_video_ids=used_ids,
    )
    id2 = _video_id_from_url(v2)
    if id2:
        used_ids.add(id2)

    v3 = pick_first_qualified_youtube_video(
        q3_raw,
        topic=topic,
        subject=subject,
        grade=grade,
        notes_keywords=notes_keywords,
        exclude_video_ids=used_ids,
    )
    u1 = v1 or f"https://www.youtube.com/results?search_query={q1}"
    u2 = v2 or f"https://www.youtube.com/results?search_query={q2}"
    u3 = v3 or f"https://www.youtube.com/results?search_query={q3}"

    intro = (
        intro_override.strip()
        if intro_override and intro_override.strip()
        else f"Here are safe, openable learning links for \"{topic}\" ({subject} - {grade}). Pick one short item and review with a parent."
    )

    return "\n".join(
        [
            intro,
            "",
            "### 1. Getting started",
            f"Resource: Intro videos for {topic}",
            u1,
            "Why: opens a beginner-friendly video list so you can choose a clear first explanation.",
            "",
            "### 2. Build understanding",
            f"Resource: Animated worked examples for {topic}",
            u2,
            "Why: example-based explanations help connect ideas to step-by-step solving.",
            "",
            "### 3. Practice and teach-back",
            f"Resource: Practice videos/questions for {topic}",
            u3,
            "Why: use one practice item, then explain your answer back to a parent.",
        ]
    )


def build_child_knowledge_prompt(input_data: LearningCardChildKnowledgeGenerateRequest) -> str:
    return "\n".join(
        [
            "You are BridgeEd AI generating student-facing discovery content.",
            "Return plain markdown only (no JSON).",
            "Output format:",
            "- 1 short intro paragraph for students and parents",
            "- 3 numbered sections",
            "- each section includes: title line, one video line, one URL line, one short reason line",
            "Link policy:",
            "- Use YouTube links only.",
            "- Prefer kid-friendly cute/animated explainers when relevant.",
            "- Keep choices aligned with subject and grade level.",
            "- Avoid live streams and Shorts.",
            "- Do not repeat the same video link.",
            "- Prefer videos with duration up to 20 minutes.",
            "Keep language age-appropriate and practical.",
            f"Class / lesson: {input_data.classTitle}",
            f"Grade: {input_data.grade}",
            f"Subject: {input_data.subject}",
            f"Topic: {input_data.topic}",
            f"Teacher notes: {input_data.notes}",
        ]
    )


def generate_child_knowledge(input_data: LearningCardChildKnowledgeGenerateRequest) -> LearningCardChildKnowledgeResponse:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
    api_url = get_env("CURRICULLM_API_URL")
    api_key = get_env("CURRICULLM_API_KEY")
    model = get_env("CURRICULLM_MODEL", "CurricuLLM-AU")
    auth_header = get_env("CURRICULLM_AUTH_HEADER", "Authorization")
    auth_scheme = get_env("CURRICULLM_AUTH_SCHEME", "Bearer")
    try:
        response = requests.post(
            api_url,
            headers={
                "Content-Type": "application/json",
                auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
            },
            json={
                "model": model,
                "temperature": 0.5,
                "top_p": 0.9,
                "max_tokens": 7000,
                "curriculum": {
                    "stage": map_grade_to_stage(input_data.grade),
                    "subject": input_data.subject.strip() or "General",
                },
                "messages": [
                    {
                        "role": "system",
                        "content": "You generate concise, student-friendly learning support content.",
                    },
                    {
                        "role": "user",
                        "content": build_child_knowledge_prompt(input_data),
                    },
                ],
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        content = (
            data.get("choices", [{}])[0].get("message", {}).get("content")
            or data.get("output_text")
            or data.get("content")
            or data.get("result")
        )
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("CurricuLLM child knowledge response did not contain usable content.")
        intro = _extract_intro_paragraph(content)
        safe_content = build_child_knowledge_safe_content(input_data, intro_override=intro)
        return LearningCardChildKnowledgeResponse(content=safe_content.strip(), source="curricullm")
    except Exception as exc:
        if not allow_fallback:
            raise
        return build_child_knowledge_fallback(input_data).model_copy(update={"warning": str(exc)})


def normalize_ui_lang(raw: str | None) -> str:
    short = (raw or "en").strip().lower().split("-")[0]
    if short in {"zh", "fr"}:
        return short
    return "en"


def reply_language_name(ui_lang: str) -> str:
    if ui_lang == "zh":
        return "Simplified Chinese"
    if ui_lang == "fr":
        return "French"
    return "English"


def quiz_headings(ui_lang: str) -> tuple[str, str]:
    if ui_lang == "zh":
        return "## 快速测验", "## 答案解析"
    if ui_lang == "fr":
        return "## Quiz rapide", "## Corrige"
    return "## Quick Quiz", "## Answer Key"


_QUIZ_HEADING_PATTERN = r"##\s*(?:Quick Quiz|Quiz rapide|快速测验)"
_ANSWER_HEADING_PATTERN = (
    r"##\s*(?:"
    r"Answer Key|Answers|Correct Answers|Answer & Explanation|Answers & Explanations|"
    r"Corrige|Reponses|Reponses et explications|"
    r"答案解析|答案|参考答案)"
)


def quiz_type_tags(ui_lang: str) -> tuple[str, str, str]:
    if ui_lang == "zh":
        return "[选择题]", "[判断题]", "[简答题]"
    if ui_lang == "fr":
        return "[QCM]", "[Vrai_Faux]", "[Reponse_Courte]"
    return "[multiple choice]", "[true false]", "[short answer]"


_PRACTICE_HEADING_BY_LANG = {
    "en": "## Hands-on Practice",
    "zh": "## 动手练习",
    "fr": "## Pratique manuelle",
}

_TEACH_BACK_HEADING_BY_LANG = {
    "en": "## Teach-back (Feynman Method)",
    "zh": "## 费曼讲解练习",
    "fr": "## Teach-back (methode Feynman)",
}

_PRACTICE_SECTION_HEADINGS_BY_LANG = {
    "en": [
        ("Goal", "### Goal"),
        ("Materials", "### Materials"),
        ("Steps (10-15 min)", "### Steps (10-15 min)"),
        ("Parent Coaching Script", "### Parent Coaching Script"),
        ("Reflection Questions", "### Reflection Questions"),
        ("Safety Note", "### Safety Note"),
    ],
    "zh": [
        ("目标", "### 目标"),
        ("材料", "### 材料"),
        ("步骤（10-15分钟）", "### 步骤（10-15分钟）"),
        ("步骤(10-15分钟)", "### 步骤（10-15分钟）"),
        ("家长引导话术", "### 家长引导话术"),
        ("反思问题", "### 反思问题"),
        ("安全提示", "### 安全提示"),
    ],
    "fr": [
        ("Objectif", "### Objectif"),
        ("Materiel", "### Materiel"),
        ("Etapes (10-15 min)", "### Etapes (10-15 min)"),
        ("Script parent", "### Script parent"),
        ("Questions de reflexion", "### Questions de reflexion"),
        ("Note de securite", "### Note de securite"),
    ],
}

_ROLE_COPY_BY_LANG = {
    "en": {
        "parent": "I can help turn this into a parent-friendly next step.",
        "student": "I can help with a simple explanation and what to do next.",
        "teacher": "I can help draft a clear, family-friendly response.",
    },
    "zh": {
        "parent": "我可以把这段内容整理成家长易懂的下一步建议。",
        "student": "我可以用简单的话解释，并给你下一步怎么做。",
        "teacher": "我可以帮你写一段清晰、对家庭友好的回复。",
    },
    "fr": {
        "parent": "Je peux transformer cela en prochaine etape claire pour les parents.",
        "student": "Je peux l'expliquer simplement avec une prochaine action.",
        "teacher": "Je peux rediger une reponse professionnelle et chaleureuse.",
    },
}

_SUGGESTION_COPY_BY_LANG = {
    "en": {
        "title": "Suggested reply:",
        "line1": "1. Acknowledge the question in plain language.",
        "line2": "2. Give one clear next step for home.",
        "line3": "3. Offer a short follow-up if the learner is still stuck.",
        "asked_prefix": "You asked: ",
        "thread_prefix": "Thread",
    },
    "zh": {
        "title": "建议回复：",
        "line1": "1. 先用简单语言复述对方的问题。",
        "line2": "2. 给出一个在家就能执行的明确下一步。",
        "line3": "3. 如果仍有困难，补一句简短跟进建议。",
        "asked_prefix": "你提到：",
        "thread_prefix": "话题",
    },
    "fr": {
        "title": "Reponse suggeree :",
        "line1": "1. Reformulez la question en langage simple.",
        "line2": "2. Donnez une prochaine etape claire a la maison.",
        "line3": "3. Ajoutez un court suivi si l eleve bloque encore.",
        "asked_prefix": "Vous avez demande : ",
        "thread_prefix": "Fil",
    },
}

def build_chat_fallback(input_data: ChatRespondRequest) -> ChatRespondResponse:
    ui_lang = normalize_ui_lang(getattr(input_data, "uiLang", "en"))
    message = input_data.message.strip().lower()
    is_quiz = _is_make_quiz_message(message)
    is_practice = bool(re.match(r"^/?practice(\b|$)", message))
    is_teach_back = bool(re.match(r"^/?teach-?back(\b|$)", message))
    prior_quiz_count = sum(
        1
        for m in input_data.history
        if m.type == "out" and _is_make_quiz_message(m.text)
    )
    quiz_round = prior_quiz_count + 1 if is_quiz else 0
    if is_quiz:
        topic = (input_data.cardContext.topic if input_data.cardContext else "").strip() or input_data.threadTitle or "this topic"
        subject = (input_data.cardContext.subject if input_data.cardContext else "").strip() or "the subject"
        grade = (input_data.cardContext.grade if input_data.cardContext else "").strip() or "the student"
        subject_l = subject.lower()
        is_math_subject = any(k in subject_l for k in ("math", "mathemat", "数学", "數學", "algebra"))
        heading, key_heading = quiz_headings(ui_lang)
        mc_tag, tf_tag, sa_tag = quiz_type_tags(ui_lang)
        if ui_lang == "zh":
            if not is_math_subject:
                return ChatRespondResponse(
                    reply=(
                        f"{heading}\n\n"
                        f"1. {mc_tag} 关于“{topic}”，下列哪一项最符合本课核心概念？\n"
                        "   - A) 与课堂关键词和步骤一致的解释\n"
                        "   - B) 与本课无关的随机事实\n"
                        "   - C) 只背答案不看过程\n"
                        "   - D) 跳过题干直接猜\n\n"
                        f"2. {mc_tag} 在 {subject}（{grade}）里，学习“{topic}”的第一步更应该是？\n"
                        "   - A) 先读题并找关键词\n"
                        "   - B) 先抄别人答案\n"
                        "   - C) 先写很长一段话\n"
                        "   - D) 不看条件直接做\n\n"
                        f"3. {mc_tag} 哪种练习最有助于巩固“{topic}”？\n"
                        "   - A) 做一个例题并解释每一步\n"
                        "   - B) 只看答案不练习\n"
                        "   - C) 一直重复同一句定义\n"
                        "   - D) 完全换到不相关主题\n\n"
                        f"4. {tf_tag} 学习“{topic}”时，理解过程比只记结论更重要。\n"
                        "   - A) 正确\n"
                        "   - B) 错误\n\n"
                        f"5. {sa_tag} 请用一句话说明“{topic}”在 {subject} 中的作用。\n\n"
                        f"{key_heading}\n\n"
                        "1. A - 核心概念应与课堂关键词和步骤一致。\n"
                        "2. A - 先读题并找关键词能提升准确率。\n"
                        "3. A - 解释步骤有助于真正掌握。\n"
                        "4. A - 理解过程才能迁移到新题。\n"
                        f"5. short: 能清楚说明“{topic}”的定义和用途。"
                    ),
                    source="demo-fallback",
                )
            return ChatRespondResponse(
                reply=(
                    f"{heading}\n\n"
                    f"1. {mc_tag} 下列哪个是多项式 (x^2 - 9) 的正确因式分解？\n"
                    "   - A) (x - 3)(x + 3)\n"
                    "   - B) (x + 3)(x + 3)\n"
                    "   - C) (x - 9)(x + 1)\n"
                    "   - D) (x - 1)(x + 9)\n\n"
                    f"2. {mc_tag} 因式分解 (2x^2 + 6x) 的正确结果是？\n"
                    "   - A) 2(x + 4)\n"
                    "   - B) x(2x + 6)\n"
                    "   - C) 2x(x + 3)\n"
                    "   - D) 2x + 3\n\n"
                    f"3. {mc_tag} 下列哪个步骤最适合先用于 {topic} 相关题目？\n"
                    "   - A) 先读题并圈出关键信息\n"
                    "   - B) 不读题直接猜答案\n"
                    "   - C) 先抄同学答案\n"
                    "   - D) 跳过所有步骤\n\n"
                    f"4. {tf_tag} 在学习 {topic} 时，只背答案而不理解过程是有效方法。\n"
                    "   - A) 正确\n"
                    "   - B) 错误\n\n"
                    f"5. {sa_tag} 请用一句话说明 {topic} 的核心概念，以及它和 {subject} 的关系。\n\n"
                    f"{key_heading}\n\n"
                    "1. A - 这是平方差公式 a^2 - b^2 = (a - b)(a + b) 的直接应用。\n"
                    "2. C - 两项的最大公因式是 2x，提出后得到 2x(x + 3)。\n"
                    "3. A - 先理解题意能提高后续解题准确率。\n"
                    "4. B - 只背答案不能迁移，理解过程才有用。\n"
                    f"5. short: 能准确描述 {topic} 的定义，并说明它如何帮助解题。"
                ),
                source="demo-fallback",
            )

        if ui_lang == "fr":
            mc_tag, tf_tag, sa_tag = "[QCM]", "[Vrai_Faux]", "[Reponse_Courte]"
        else:
            mc_tag, tf_tag, sa_tag = "[multiple_choice]", "[true_false]", "[short_answer]"
        if not is_math_subject:
            if ui_lang == "fr":
                return ChatRespondResponse(
                    reply=(
                        f"{heading}\n\n"
                        f"1. {mc_tag} Quelle proposition correspond le mieux a l'idee centrale de « {topic} » ?\n"
                        "   - A) Une explication alignee avec les mots-cles et les etapes du cours\n"
                        "   - B) Un fait aleatoire sans lien avec la lecon\n"
                        "   - C) Memoriser la reponse sans comprendre\n"
                        "   - D) Repondre sans lire l'enonce\n\n"
                        f"2. {mc_tag} En {subject} ({grade}), quelle est la meilleure premiere etape pour « {topic} » ?\n"
                        "   - A) Lire la question et reperer les mots-cles\n"
                        "   - B) Copier une reponse d'un camarade\n"
                        "   - C) Ecrire un long paragraphe d'abord\n"
                        "   - D) Ignorer les contraintes de la question\n\n"
                        f"3. {mc_tag} Quel type d'exercice aide le plus a consolider « {topic} » ?\n"
                        "   - A) Faire un exemple puis expliquer chaque etape\n"
                        "   - B) Lire seulement les reponses finales\n"
                        "   - C) Repeter une definition sans application\n"
                        "   - D) Changer vers un sujet non lie\n\n"
                        f"4. {tf_tag} Pour apprendre « {topic} », comprendre la demarche est plus utile que memoriser le resultat.\n"
                        "   - A) True\n"
                        "   - B) False\n\n"
                        f"5. {sa_tag} Explique en une phrase le role de « {topic} » en {subject}.\n\n"
                        f"{key_heading}\n\n"
                        "1. A - L'idee centrale doit rester alignee avec le cours.\n"
                        "2. A - Identifier les mots-cles augmente la precision.\n"
                        "3. A - Expliquer les etapes montre la comprehension.\n"
                        "4. A - La demarche permet de transferer les apprentissages.\n"
                        f"5. short: Une phrase claire sur la definition et l'utilite de « {topic} »."
                    ),
                    source="demo-fallback",
                )
            return ChatRespondResponse(
                reply=(
                    f"{heading}\n\n"
                    f"1. {mc_tag} Which option best matches the core idea of {topic}?\n"
                    "   - A) An explanation aligned with class keywords and steps\n"
                    "   - B) A random fact from an unrelated topic\n"
                    "   - C) Memorizing answers without understanding\n"
                    "   - D) Guessing without reading the prompt\n\n"
                    f"2. {mc_tag} In {subject} ({grade}), what is the best first step for a {topic} question?\n"
                    "   - A) Read the prompt and identify key terms\n"
                    "   - B) Copy a classmate's answer\n"
                    "   - C) Write a long paragraph first\n"
                    "   - D) Ignore constraints and guess\n\n"
                    f"3. {mc_tag} Which practice helps most with {topic}?\n"
                    "   - A) Solve one example and explain each step\n"
                    "   - B) Only read final answers\n"
                    "   - C) Repeat one definition without applying it\n"
                    "   - D) Switch to an unrelated topic\n\n"
                    f"4. {tf_tag} For learning {topic}, understanding the process matters more than memorizing outcomes.\n"
                    "   - A) True\n"
                    "   - B) False\n\n"
                    f"5. {sa_tag} In one sentence, explain the role of {topic} in {subject}.\n\n"
                    f"{key_heading}\n\n"
                    "1. A - The core idea should align with class method and vocabulary.\n"
                    "2. A - Identifying key terms improves accuracy.\n"
                    "3. A - Explaining steps demonstrates real understanding.\n"
                    "4. A - Process understanding transfers to new problems.\n"
                    f"5. short: A clear one-sentence definition and purpose of {topic}."
                ),
                source="demo-fallback",
            )
        return ChatRespondResponse(
            reply=(
                f"{heading}\n"
                f"\n1. {mc_tag} Which factorization is correct for (x^2 + 7x + 10) in {subject}?\n"
                "   - A) (x + 5)(x + 2)\n"
                "   - B) (x + 10)(x + 1)\n"
                "   - C) (x + 3)(x + 4)\n"
                "   - D) (x + 6)(x + 1)\n\n"
                f"2. {mc_tag} For {grade}, what is a good first step when solving a {topic} question?\n"
                "   - A) Skip reading and guess quickly.\n"
                "   - B) Identify what the question is asking.\n"
                "   - C) Write a long paragraph first.\n"
                "   - D) Memorize without checking meaning.\n\n"
                f"3. {mc_tag} Which example is most connected to {topic}?\n"
                "   - A) An example that uses the same key terms and process.\n"
                "   - B) A random fact from another subject.\n"
                "   - C) A story with no learning goal.\n"
                "   - D) A topic with no overlap.\n\n"
                f"4. {tf_tag} If a student is stuck on {topic}, copying answers without understanding is a good next step.\n"
                "   - A) True\n"
                "   - B) False\n\n"
                f"5. {sa_tag} In one short sentence, explain the key idea of {topic} in your own words.\n\n"
                f"{key_heading}\n\n"
                "1. A - (x + 5)(x + 2) expands to x^2 + 7x + 10.\n"
                "2. B - Understanding the prompt first improves accuracy.\n"
                "3. A - Closely related examples reinforce transfer.\n"
                "4. B - Copying without understanding does not help learning.\n"
                f"5. short: A clear one-sentence explanation of {topic} using correct key terms."
            ),
            source="demo-fallback",
        )
    if is_practice:
        topic = (input_data.cardContext.topic if input_data.cardContext else "").strip() or input_data.threadTitle or "this topic"
        subject = (input_data.cardContext.subject if input_data.cardContext else "").strip() or "the subject"
        grade = (input_data.cardContext.grade if input_data.cardContext else "").strip() or "the student"
        heading = _PRACTICE_HEADING_BY_LANG.get(ui_lang, _PRACTICE_HEADING_BY_LANG["en"])
        return ChatRespondResponse(
            reply=(
                f"{heading}\n\n"
                f"Topic: {topic} ({subject}, {grade})\n\n"
                "### Goal\n"
                f"Use a simple at-home activity to make the key idea of {topic} visible and concrete.\n\n"
                "### Materials\n"
                "- Paper and pen\n"
                "- 10-20 small objects (beans, buttons, or coins)\n"
                "- A bowl or tray\n\n"
                "### Steps (10-15 min)\n"
                "1. Parent asks the child to explain what today's concept means in one sentence.\n"
                "2. Child uses objects to model one example from class.\n"
                "3. Parent asks: \"What changes? What stays the same?\" while the child adjusts the model.\n"
                "4. Child writes the matching math/science/subject expression or short explanation.\n"
                "5. Child checks the result by explaining the process back to the parent.\n\n"
                "### Parent Coaching Script\n"
                "- \"Show me step 1 first.\"\n"
                "- \"Why did you choose this step?\"\n"
                "- \"Can you show a second example with different numbers?\"\n\n"
                "### Reflection Questions\n"
                "1. Which step felt easiest, and why?\n"
                "2. Where did confusion happen?\n"
                "3. What would you try first on homework tonight?\n\n"
                "### Safety Note\n"
                "Use only safe household materials and keep small objects away from very young children."
            ),
            source="demo-fallback",
        )
    if is_teach_back:
        topic = (input_data.cardContext.topic if input_data.cardContext else "").strip() or input_data.threadTitle or "this topic"
        subject = (input_data.cardContext.subject if input_data.cardContext else "").strip() or "the subject"
        grade = (input_data.cardContext.grade if input_data.cardContext else "").strip() or "the student"
        if ui_lang == "zh":
            return ChatRespondResponse(
                reply=(
                    "## 费曼讲解练习\n\n"
                    f"主题：{topic}（{subject}，{grade}）\n\n"
                    "### 目标\n"
                    "像小老师一样，用自己的话把知识点讲给家长听。\n\n"
                    "### 3步讲解流程\n"
                    "1. 用一句简单的话说清定义。\n"
                    "2. 给出一个贴近日常或课堂的例子。\n"
                    "3. 说一个常见错误，并说明如何避免。\n\n"
                    "### 自我检测\n"
                    "1. 哪一步我还讲不清楚？\n"
                    "2. 不看笔记，我还能再讲一遍吗？\n"
                    "3. 下一步我应该练哪一题？\n\n"
                    "### 总结\n"
                    "用30秒做一次总结：它是什么、怎么用、接下来练什么。"
                ),
                source="demo-fallback",
            )
        if ui_lang == "fr":
            return ChatRespondResponse(
                reply=(
                    "## Exercice Teach-back (methode Feynman)\n\n"
                    f"Sujet : {topic} ({subject}, {grade})\n\n"
                    "### Objectif\n"
                    "Explique la notion comme un mini-professeur, avec tes propres mots.\n\n"
                    "### Methode en 3 etapes\n"
                    "1. Donne une definition tres simple en une phrase.\n"
                    "2. Donne un exemple concret de la vie quotidienne.\n"
                    "3. Donne une erreur frequente et comment l'eviter.\n\n"
                    "### Auto-verification\n"
                    "1. Quelle etape est encore floue ?\n"
                    "2. Puis-je reexpliquer sans regarder le cours ?\n"
                    "3. Quelle question vais-je pratiquer ensuite ?\n\n"
                    "### Cloture\n"
                    "Termine par un resume de 30 secondes : idee, utilisation, prochain entrainement."
                ),
                source="demo-fallback",
            )
        return ChatRespondResponse(
            reply=(
                "## Teach-back (Feynman Method)\n\n"
                f"Topic: {topic} ({subject}, {grade})\n\n"
                "### Goal\n"
                "Explain the concept to a parent in your own words, like a mini teacher.\n\n"
                "### 3-Step Explain Flow\n"
                "1. Give a one-sentence plain-language definition.\n"
                "2. Give one real-life or class example.\n"
                "3. Name one common mistake and how to avoid it.\n\n"
                "### Self-check\n"
                "1. Which step is still unclear?\n"
                "2. Can I explain it again without notes?\n"
                "3. What should I practice next?\n\n"
                "### Wrap-up\n"
                "End with a 30-second summary: what it is, how to use it, and next practice."
            ),
            source="demo-fallback",
        )

    role_copy = _ROLE_COPY_BY_LANG.get(ui_lang, _ROLE_COPY_BY_LANG["en"])
    suggestion = _SUGGESTION_COPY_BY_LANG.get(ui_lang, _SUGGESTION_COPY_BY_LANG["en"])
    lead = role_copy.get(input_data.role, role_copy.get("parent", "I can help with this message."))
    if input_data.threadTitle:
        if ui_lang == "zh":
            thread_hint = f"{suggestion['thread_prefix']}：{input_data.threadTitle}。 "
        else:
            thread_hint = f"{suggestion['thread_prefix']} : {input_data.threadTitle}. "
    else:
        thread_hint = ""
    return ChatRespondResponse(
        reply=(
            f"{lead} {thread_hint}"
            f"{suggestion['asked_prefix']}{input_data.message.strip()}\n\n"
            f"{suggestion['title']}\n"
            f"{suggestion['line1']}\n"
            f"{suggestion['line2']}\n"
            f"{suggestion['line3']}"
        ),
        source="demo-fallback",
    )


def build_chat_prompt(input_data: ChatRespondRequest) -> str:
    ui_lang = normalize_ui_lang(getattr(input_data, "uiLang", "en"))
    lang_name = reply_language_name(ui_lang)
    message = input_data.message.strip().lower()
    is_quiz = _is_make_quiz_message(message)
    history_lines = []
    # Keep fuller thread context for /make-quiz so follow-up quiz generations can
    # reuse prior explained knowledge and avoid repetition.
    history_source = input_data.history if is_quiz else input_data.history[-12:]
    for msg in history_source:
        speaker = "User" if msg.type == "out" else msg.who
        history_lines.append(f"{speaker}: {msg.text}")

    context_lines: list[str] = []
    if input_data.cardContext is not None:
        cc = input_data.cardContext
        context_lines.extend(
            [
                "Structured card context:",
                f"- Topic: {cc.topic}",
                f"- Grade: {cc.grade}",
                f"- Subject: {cc.subject}",
                f"- Teacher notes: {cc.teacherNotes}",
                f"- Class/Lesson: {cc.classLessonTitle}",
                f"- Parent summary: {cc.parentSummary}",
            ]
        )
        if cc.tonightActions:
            context_lines.append("- Tonight actions:")
            for action in cc.tonightActions[:6]:
                preset = str(action.get("preset", ""))
                include = bool(action.get("include", False))
                text = str(action.get("text", "") or "")
                context_lines.append(f"  - preset={preset}, include={include}, text={text}")
        if cc.isFirstExplanation:
            context_lines.append(
                "- This is likely the first explanation request for this card. Start with a plain definition, one concrete example, and one immediate next step."
            )

    # reuse parsed command flags from the current message
    is_practice = bool(re.match(r"^/?practice(\b|$)", message))
    is_teach_back = bool(re.match(r"^/?teach-?back(\b|$)", message))
    prior_quiz_count = sum(
        1
        for m in input_data.history
        if m.type == "out" and _is_make_quiz_message(m.text)
    )
    quiz_round = prior_quiz_count + 1 if is_quiz else 0
    prior_teach_back_count = sum(
        1
        for m in input_data.history
        if m.type == "out" and bool(re.match(r"^/?teach-?back(\b|$)", m.text.strip().lower()))
    )
    teach_back_round = prior_teach_back_count + 1 if is_teach_back else 0

    if is_quiz:
        quiz_heading, answer_heading = quiz_headings(ui_lang)
        mc_tag, tf_tag, sa_tag = quiz_type_tags(ui_lang)
        quiz_instructions = [
            "The user requested /make-quiz.",
            "Generate a quiz list directly related to the provided card context/topic.",
            "Return markdown only using this structure:",
            quiz_heading,
            "",
            f"1. {mc_tag} Question text",
            "   - A) Option",
            "   - B) Option",
            "   - C) Option",
            "   - D) Option",
            "",
            f"2. {mc_tag} Question text",
            "   - A) Option",
            "   - B) Option",
            "   - C) Option",
            "   - D) Option",
            "",
            f"3. {mc_tag} Question text",
            "   - A) Option",
            "   - B) Option",
            "   - C) Option",
            "   - D) Option",
            "",
            f"4. {tf_tag} Statement or question text",
            "   - A) True",
            "   - B) False",
            "",
            f"5. {sa_tag} Short-answer question text",
            "",
            answer_heading,
            "",
            "1. B - short explanation",
            "2. C - short explanation",
            "3. A - short explanation",
            "4. A - short explanation (A=True, B=False)",
            "5. short: expected short answer",
            "Rules:",
            "- Exactly 5 questions total: 3 multiple choice + 1 true false + 1 short answer.",
            "- Difficulty suitable for the student's grade.",
            "- Keep wording clear and age-appropriate.",
            "- Questions must align with topic/subject and not be generic.",
            "- Do NOT default to factoring/algebra/math unless the provided subject/topic is explicitly math-focused.",
            "- Put each option on its own new line (never inline after the question sentence).",
            "- Add one blank line between questions.",
            f"- Include the {mc_tag}/{tf_tag}/{sa_tag} tag in every question line.",
            f"- This is quiz round {quiz_round} in the same thread.",
            "- If round >= 2, generate a NEW set of 5 questions and avoid repeating prior stems/options.",
            "- Prefer different sub-skills each round (concept check, procedure, error-spotting, application, explain-why).",
        ]
    else:
        quiz_instructions = []

    if is_practice:
        practice_heading = _PRACTICE_HEADING_BY_LANG.get(ui_lang, _PRACTICE_HEADING_BY_LANG["en"])
        practice_instructions = [
            "The user requested /practice.",
            "Generate ONE hands-on home practice case that a parent can run with the child to understand the topic.",
            "Return markdown only with this structure:",
            practice_heading,
            "",
            "### Goal",
            "1-2 short sentences tied directly to topic/subject/grade.",
            "",
            "### Materials",
            "- 4 to 8 simple household items, low-cost and easy to find.",
            "",
            "### Steps (10-15 min)",
            "1. ...",
            "2. ...",
            "3. ...",
            "4. ...",
            "5. ...",
            "",
            "### Parent Coaching Script",
            "- 3 to 5 short prompts parent can say while guiding.",
            "",
            "### Reflection Questions",
            "1. ...",
            "2. ...",
            "3. ...",
            "",
            "### Safety Note",
            "One concise safety reminder.",
            "Rules:",
            "- Must be practical and executable at home.",
            "- Keep language parent-friendly and age-appropriate.",
            "- Avoid generic advice; ground the activity in the specific card topic.",
            "- Include at least one step where child explains back in their own words.",
            "- No JSON, no code block.",
        ]
    else:
        practice_instructions = []

    if is_teach_back:
        teach_back_heading = _TEACH_BACK_HEADING_BY_LANG.get(ui_lang, _TEACH_BACK_HEADING_BY_LANG["en"])
        teach_back_instructions = [
            "The user requested /teach-back.",
            "Generate a child-friendly teach-back guide using the Feynman method.",
            "The goal is to help the child explain the concept clearly to a parent.",
            "Return markdown only with this structure:",
            teach_back_heading,
            "",
            "### Goal",
            "1-2 short sentences.",
            "",
            "### 3-Step Explain Flow",
            "1. Simple definition in child's own words",
            "2. One concrete example",
            "3. One common mistake and correction",
            "",
            "### Self-check",
            "1. ...",
            "2. ...",
            "3. ...",
            "",
            "### Wrap-up",
            "Ask for a 30-second final summary from the child.",
            "Rules:",
            "- Keep it age-appropriate and encouraging.",
            "- Tie examples directly to the card topic.",
            "- Avoid jargon and long theory-heavy explanations.",
            f"- This is teach-back round {teach_back_round} in the same thread.",
            "- If round >= 2, MUST use a different worked example and a different common mistake from previous responses.",
            "- Avoid reusing the exact same sentences from earlier teach-back replies.",
            "- No JSON, no code block.",
        ]
    else:
        teach_back_instructions = []

    return "\n".join(
        [
            "You are BridgeEd AI inside the chat workspace.",
            "Help teachers, parents, and students communicate clearly about learning.",
            "Keep replies concise, helpful, and action-oriented.",
            f"Write the full final reply in {lang_name}.",
            "Do not switch to another language unless quoting a fixed proper noun or command.",
            "If the user is a parent, use plain language and practical home support.",
            "If the user is a teacher, draft a professional but warm response.",
            "If the user is a student, keep it supportive and age-appropriate.",
            "Prefer a short answer with one clear next step.",
            f"Role: {input_data.role}",
            f"Thread title: {input_data.threadTitle}",
            f"Latest user message: {input_data.message}",
            *(context_lines if context_lines else ["Structured card context: (not provided)"]),
            *(quiz_instructions if quiz_instructions else []),
            *(practice_instructions if practice_instructions else []),
            *(teach_back_instructions if teach_back_instructions else []),
            "Recent conversation:",
            "\n".join(history_lines) if history_lines else "(no prior messages)",
            "Return only the reply text, no JSON.",
        ]
    )


def respond_with_curricullm(input_data: ChatRespondRequest) -> ChatRespondResponse:
    api_url = get_env("CURRICULLM_API_URL")
    api_key = get_env("CURRICULLM_API_KEY")
    model = get_env("CURRICULLM_MODEL", "CurricuLLM-AU")
    auth_header = get_env("CURRICULLM_AUTH_HEADER", "Authorization")
    auth_scheme = get_env("CURRICULLM_AUTH_SCHEME", "Bearer")

    is_quiz = _is_make_quiz_message(input_data.message)
    is_teach_back = bool(re.match(r"^/?teach-?back(\b|$)", input_data.message.strip().lower()))
    is_practice = bool(re.match(r"^/?practice(\b|$)", input_data.message.strip().lower()))
    temperature = 0.7 if is_quiz else (0.65 if is_teach_back else 0.4)
    ui_lang = normalize_ui_lang(getattr(input_data, "uiLang", "en"))
    prompt = build_chat_prompt(input_data)

    logger.info(
        "CurricuLLM chat request: ui_lang=%s is_quiz=%s role=%s thread_id=%s model=%s message=%s",
        ui_lang,
        is_quiz,
        input_data.role,
        input_data.threadId,
        model,
        _log_preview(input_data.message, 160),
    )
    if is_quiz:
        logger.info("CurricuLLM quiz prompt preview: %s", _log_preview(prompt, 900))

    response = requests.post(
        api_url,
        headers={
            "Content-Type": "application/json",
            auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
        },
        json={
            "model": model,
            "temperature": temperature,
            "top_p": 0.9,
            "max_tokens": 5000,
            "messages": [
                {
                    "role": "system",
                    "content": "You are BridgeEd AI, a school-home communication assistant.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    logger.info(
        "CurricuLLM chat raw response: status=%s body=%s",
        response.status_code,
        _log_preview(data, 1200),
    )
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content")
        or data.get("output_text")
        or data.get("content")
        or data.get("result")
    )
    if isinstance(content, dict):
        content = content.get("reply") or content.get("text") or ""
    if not isinstance(content, str) or not content.strip():
        logger.error("CurricuLLM chat response missing usable content: %s", _log_preview(data, 1200))
        raise RuntimeError("CurricuLLM chat response did not contain usable content.")

    reply = content.strip()
    if _is_make_quiz_message(input_data.message):
        logger.info("CurricuLLM quiz raw reply preview: %s", _log_preview(reply, 1200))
        reply = normalize_quiz_markdown(reply, ui_lang)
        logger.info("CurricuLLM quiz normalized reply preview: %s", _log_preview(reply, 1200))
        if not _quiz_reply_has_answer_key(reply):
            logger.error(
                "Quiz output missing answer key after normalization: ui_lang=%s thread_id=%s reply=%s",
                ui_lang,
                input_data.threadId,
                _log_preview(reply, 1600),
            )
            raise RuntimeError("Quiz output missing answer key section.")
    elif is_practice:
        reply = normalize_practice_markdown(reply, ui_lang)

    return ChatRespondResponse(reply=reply, source="curricullm")


def normalize_quiz_markdown(text: str, ui_lang: str = "en") -> str:
    out = text.replace("\r\n", "\n")
    quiz_heading, key_heading = quiz_headings(ui_lang)
    mc_tag, tf_tag, sa_tag = quiz_type_tags(ui_lang)

    # Quiz content should render as plain text, not emphasis. Some model outputs
    # wrap whole questions/options in markdown bold markers, which then causes
    # large stretches of the quiz to appear bold after line normalization.
    out = out.replace("**", "").replace("__", "")

    out = re.sub(r"(?im)^\s*(?:##\s*)?quick quiz\s*$", quiz_heading, out)
    out = re.sub(r"(?im)^\s*(?:##\s*)?answer key\s*$", key_heading, out)
    out = re.sub(r"(?im)^\s*(?:##\s*)?correct answers\s*$", key_heading, out)
    out = re.sub(r"(?im)^\s*(?:##\s*)?answers?(?:\s*&\s*explanations?)?\s*$", key_heading, out)
    out = re.sub(r"(?i)\[multiple_choice\]", mc_tag, out)
    out = re.sub(r"(?i)\[true_false\]", tf_tag, out)
    out = re.sub(r"(?i)\[short_answer\]", sa_tag, out)
    # Some model outputs already include markdown headings, so repeated normalization
    # can create variants like "## ## Quick Quiz" or "## ## ## Answer Key Key".
    out = re.sub(r"(?im)^(?:\s*##\s*){2,}.*quick quiz.*$", quiz_heading, out)
    out = re.sub(r"(?im)^(?:\s*##\s*){2,}.*(?:answer key|answers?).*$", key_heading, out)
    out = re.sub(r"(?im)^\s*##\s*quick quiz(?:\s+quick quiz)+\s*$", quiz_heading, out)
    out = re.sub(r"(?im)^\s*##\s*answer key(?:\s+key)+\s*$", key_heading, out)

    out = re.sub(
        rf"({re.escape(quiz_heading)}|{_QUIZ_HEADING_PATTERN})\s*(\d+\.\s)",
        r"\1\n\n\2",
        out,
        flags=re.IGNORECASE,
    )
    out = re.sub(
        rf"({re.escape(key_heading)}|{_ANSWER_HEADING_PATTERN})\s*(\d+\.\s)",
        r"\1\n\n\2",
        out,
        flags=re.IGNORECASE,
    )

    # Force A/B/C/D options onto separate lines if model emitted them inline.
    out = re.sub(r"(?<!-)\s+([A-D]\))", r"\n- \1", out)
    out = re.sub(r"(?m)^\s*([A-D]\))", r"- \1", out)
    out = re.sub(r"(?m)^\s*-\s*([A-D]\))", r"- \1", out)
    # Some model outputs produce a standalone "-" line before each option.
    # Remove those empty bullets while keeping the real A/B/C/D option rows.
    out = re.sub(r"(?m)^\s*-\s*$\n(?=\s*-\s*[A-D]\))", "", out)
    out = re.sub(r"\n\s*-\s*\n\s*-\s*([A-D]\))", r"\n- \1", out)

    # Add spacing between questions and answer-key items when they run together.
    out = re.sub(r"([^\n])\s+(\d+\.\s)", r"\1\n\n\2", out)
    out = re.sub(r"\n{3,}", "\n\n", out)

    return out.strip()


def normalize_practice_markdown(text: str, ui_lang: str = "en") -> str:
    out = (text or "").replace("\r\n", "\n").strip()
    heading = _PRACTICE_HEADING_BY_LANG.get(ui_lang, _PRACTICE_HEADING_BY_LANG["en"])
    if not re.search(r"(?im)^\s*##\s*", out):
        out = f"{heading}\n\n{out}"
    else:
        out = re.sub(r"(?im)^\s*##\s*.*hands[- ]?on practice.*$", heading, out)
        out = re.sub(r"(?im)^\s*##\s*动手练习\s*$", heading, out)
        out = re.sub(r"(?im)^\s*##\s*pratique manuelle\s*$", heading, out)

    for plain, markdown in _PRACTICE_SECTION_HEADINGS_BY_LANG.get(
        ui_lang, _PRACTICE_SECTION_HEADINGS_BY_LANG["en"]
    ):
        out = re.sub(rf"(?im)^\s*(?:###\s*)?{re.escape(plain)}\s*$", markdown, out)

    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def _quiz_reply_has_answer_key(text: str) -> bool:
    out = (text or "").replace("\r\n", "\n")
    has_heading = bool(re.search(rf"(?im)^{_ANSWER_HEADING_PATTERN}\s*$", out))
    if not has_heading:
        return False
    answer_lines = re.findall(
        r"(?im)^\s*\d+\.\s*(?:[A-Da-d]\b|short\s*:|answer\s*:|model answer\s*:|expected answer\s*:|简答\s*:|réponse\s*:|reponse\s*:)",
        out,
    )
    return len(answer_lines) >= 4


def _split_quiz_and_answer_sections(quiz_text: str) -> tuple[str, str]:
    normalized = (quiz_text or "").replace("\r\n", "\n")
    m = re.search(rf"(?im)^{_ANSWER_HEADING_PATTERN}\s*$", normalized)
    if not m:
        return normalized, ""
    return normalized[: m.start()].strip(), normalized[m.end() :].strip()


def _strip_question_prefix(line: str) -> str:
    out = (line or "").strip()
    while True:
        nxt = out
        # 1. / 1) / 1、 / 1:
        nxt = re.sub(r"^\s*\d+\s*[\.\)\、:：-]\s*", "", nxt).strip()
        # 第1题 / 第 1 题:
        nxt = re.sub(r"^\s*第\s*\d+\s*题\s*[:：\.\-]?\s*", "", nxt).strip()
        # Q1 / q1:
        nxt = re.sub(r"^\s*[Qq]\s*\d+\s*[:：\.\-]?\s*", "", nxt).strip()
        if nxt == out:
            break
        out = nxt
    return out


def _extract_option_entries(block: str) -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    for raw in block.splitlines():
        m = re.match(r"^\s*(?:[-*]\s*)?([A-Da-d])[\)\.\:]\s*(.+?)\s*$", raw)
        if not m:
            continue
        label = m.group(1).upper()
        text = m.group(2).strip()
        if text:
            items.append((label, text))
    # Deduplicate labels while preserving order.
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for label, text in items:
        if label in seen:
            continue
        seen.add(label)
        out.append((label, text))
    return out


def _normalize_quiz_text(raw: str) -> str:
    out = str(raw or "")
    out = out.replace("\\(", "(").replace("\\)", ")")
    out = out.replace("\\[", "[").replace("\\]", "]")
    out = out.replace("\\{", "{").replace("\\}", "}")
    out = re.sub(r"\s+", " ", out).strip()
    return out


def _normalize_short_answer_key(raw: str) -> str:
    text = _normalize_quiz_text(raw)
    text = re.sub(
        r"(?i)^(short|answer|short answer|model answer|expected answer|简答|réponse|reponse)\s*[:：]?\s*",
        "",
        text,
    ).strip()
    if not text:
        return ""
    low = text.lower()
    if low in {"expected short answer", "a concise correct explanation.", "reference answer not provided"}:
        return ""
    return text


def _extract_answer_key_map(answer_section: str) -> dict[int, str]:
    key_map: dict[int, str] = {}
    for raw in answer_section.splitlines():
        m = re.match(r"^\s*(\d+)\.\s*(?:[-*]\s*)?([A-Da-d])\b", raw)
        if not m:
            continue
        qn = int(m.group(1))
        label = m.group(2).upper()
        key_map[qn] = label
    return key_map


def _parse_structured_questions(quiz_text: str) -> list[StructuredQuizQuestion]:
    question_section, answer_section = _split_quiz_and_answer_sections(quiz_text)
    key_map = _extract_answer_key_map(answer_section)
    short_answer_map: dict[int, str] = {}
    for raw in answer_section.splitlines():
        m = re.match(
            r"^\s*(\d+)\.\s*(?:short|answer|short answer|model answer|expected answer|简答|réponse|reponse)\s*[:：]?\s*(.+?)\s*$",
            raw,
            flags=re.IGNORECASE,
        )
        if m:
            short_answer_map[int(m.group(1))] = m.group(2).strip()

    blocks = re.findall(r"(?ms)^\s*(\d+)\.\s*(.+?)(?=^\s*\d+\.\s|\Z)", question_section)
    questions: list[StructuredQuizQuestion] = []
    for qn_str, body in blocks:
        qn = int(qn_str)
        lines = [ln.rstrip() for ln in body.splitlines() if ln.strip()]
        if not lines:
            continue
        question_text = _strip_question_prefix(f"{qn}. {lines[0]}").strip()
        qtype = "multiple_choice"
        tag = re.match(
            r"^\s*\[(multiple_choice|multiple choice|mcq|true_false|true false|tf|short_answer|short answer|short|选择题|判断题|简答题|qcm|vrai_faux|vrai faux|reponse_courte|reponse courte)\]\s*(.+)$",
            question_text,
            flags=re.IGNORECASE,
        )
        if tag:
            raw = tag.group(1).lower().replace(" ", "_")
            if raw in {"true_false", "tf", "判断题", "vrai_faux"}:
                qtype = "true_false"
            elif raw in {"short_answer", "short", "简答题", "reponse_courte"}:
                qtype = "short_answer"
            question_text = tag.group(2).strip()
        # Guard against inline options leaking into question stem.
        question_text = re.split(r"\s+[A-Da-d][\)\.\:]\s+", question_text, maxsplit=1)[0].strip()
        question_text = _normalize_quiz_text(_strip_question_prefix(question_text))

        option_entries = _extract_option_entries(body)
        options = [_normalize_quiz_text(text) for _, text in option_entries]
        answer_label = key_map.get(qn)
        option_map = {label: _normalize_quiz_text(text) for label, text in option_entries}

        if qtype == "short_answer":
            correct = _normalize_short_answer_key(short_answer_map.get(qn, "").strip())
            if not correct:
                # fallback if model used generic answer line format
                generic_line = re.search(rf"(?im)^\s*{qn}\.\s*(.+?)\s*$", answer_section)
                if generic_line:
                    candidate = generic_line.group(1).strip()
                    if candidate and not re.match(r"^[A-Da-d]\b", candidate):
                        correct = _normalize_short_answer_key(candidate)
            if not correct:
                correct = _MISSING_REFERENCE_ANSWER
            options = []
        elif qtype == "true_false":
            if len(options) < 2:
                options = ["True", "False"]
            correct = option_map.get(answer_label or "", "").strip()
            if not correct:
                text = short_answer_map.get(qn, "").strip().lower()
                if text in {"true", "false"}:
                    correct = text.title()
            if not correct:
                correct = options[0]
        else:
            if len(options) < 2:
                continue
            correct = _normalize_quiz_text(option_map.get(answer_label or "", options[0]).strip())
        if not question_text:
            question_text = f"Question {qn}"

        questions.append(
            StructuredQuizQuestion(
                questionType=qtype,  # type: ignore[arg-type]
                question=question_text,
                options=options,
                correctAnswer=correct,
            )
        )

    if not questions:
        raise RuntimeError("Could not parse structured quiz questions from /make-quiz text.")

    return questions[:10]


def generate_structured_quiz_from_text(quiz_text: str) -> StructuredQuizGenerateResponse:
    # IMPORTANT product rule:
    # Parent/teacher confirm quiz content in chat first; worksheet sent to children
    # must match that confirmed content exactly.
    # Therefore this endpoint performs deterministic parsing only and does NOT
    # regenerate questions with LLM.
    return StructuredQuizGenerateResponse(questions=_parse_structured_questions(quiz_text))


def _normalize_structured_question_payload(item: Any) -> StructuredQuizQuestion | None:
    if not isinstance(item, dict):
        return None
    raw_type = str(item.get("questionType", "multiple_choice") or "multiple_choice").strip().lower()
    qtype = raw_type if raw_type in {"multiple_choice", "true_false", "short_answer"} else "multiple_choice"
    question = str(item.get("question", "") or "").strip()
    correct = str(item.get("correctAnswer", "") or "").strip()
    options_raw = item.get("options", [])
    options = [str(x).strip() for x in options_raw] if isinstance(options_raw, list) else []
    options = [x for x in options if x]

    if not question or not correct:
        return None
    if qtype in {"multiple_choice", "true_false"} and len(options) < 2:
        if qtype == "true_false":
            options = ["True", "False"]
        else:
            return None
    if qtype == "short_answer":
        options = []
    return StructuredQuizQuestion(
        questionType=qtype,  # type: ignore[arg-type]
        question=question,
        options=options,
        correctAnswer=correct,
    )


def build_structured_quiz_prompt(quiz_text: str) -> str:
    return "\n".join(
        [
            "You are BridgeEd AI turning a quiz draft into a child worksheet.",
            "Return strict JSON only using this schema:",
            '{"questions":[{"questionType":"multiple_choice|true_false|short_answer","question":"string","options":["string"],"correctAnswer":"string"}]}',
            "Requirements:",
            "- Create 5 questions total.",
            "- Mix types for Australian school style: 3 multiple_choice, 1 true_false, 1 short_answer.",
            "- Keep language child-friendly for primary/secondary students.",
            "- Keep difficulty moderate and aligned to the draft topic.",
            "- For true_false, options must be exactly ['True','False'].",
            "- For short_answer, options must be an empty array.",
            "- Ensure correctAnswer exactly matches one option for multiple_choice/true_false.",
            "- Ensure each question tests a distinct sub-skill.",
            "Quiz draft:",
            quiz_text,
        ]
    )


def generate_structured_quiz_with_curricullm(quiz_text: str) -> StructuredQuizGenerateResponse:
    api_url = get_env("CURRICULLM_API_URL")
    api_key = get_env("CURRICULLM_API_KEY")
    model = get_env("CURRICULLM_MODEL", "CurricuLLM-AU")
    auth_header = get_env("CURRICULLM_AUTH_HEADER", "Authorization")
    auth_scheme = get_env("CURRICULLM_AUTH_SCHEME", "Bearer")

    response = requests.post(
        api_url,
        headers={
            "Content-Type": "application/json",
            auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
        },
        json={
            "model": model,
            "temperature": 0.55,
            "top_p": 0.9,
            "max_tokens": 2200,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": "You create structured school worksheets in strict JSON.",
                },
                {
                    "role": "user",
                    "content": build_structured_quiz_prompt(quiz_text),
                },
            ],
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content")
        or data.get("output_text")
        or data.get("content")
        or data.get("result")
    )
    payload: dict[str, Any]
    if isinstance(content, dict):
        payload = content
    else:
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("CurricuLLM structured-quiz response did not contain usable content.")
        payload = json.loads(extract_json_block(content))

    raw_questions = payload.get("questions")
    if not isinstance(raw_questions, list):
        raise RuntimeError("Structured quiz payload missing 'questions' array.")
    normalized: list[StructuredQuizQuestion] = []
    for item in raw_questions:
        q = _normalize_structured_question_payload(item)
        if q is not None:
            normalized.append(q)
    if len(normalized) < 3:
        raise RuntimeError("Structured quiz payload did not contain enough valid questions.")
    return StructuredQuizGenerateResponse(questions=normalized[:10])


def evaluate_structured_quiz_fallback(input_data: EvalQuizRequest) -> KnowledgeTonightCommandResponse:
    ui_lang = normalize_ui_lang(getattr(input_data, "uiLang", "en"))

    copy = {
        "en": {
            "title": "## Quiz Feedback",
            "score": "Score",
            "encouragement_high": "Excellent work overall.",
            "encouragement_mid": "Good progress, keep going.",
            "encouragement_low": "You are building understanding - one step at a time.",
            "unanswered": "Unanswered",
            "per_question": "## Per-question feedback",
            "q_title": "### Q{idx}",
            "q_label": "- Question: {text}",
            "your_answer": "- Your answer: {text}",
            "no_answer": "- Your answer: (no answer)",
            "correct_answer": "- Correct answer: {text}",
            "result_correct": "- Result: Correct",
            "result_wrong": "- Result: Not correct yet",
            "feedback_correct": "- Feedback: Great job! You understood this point well.",
            "feedback_unanswered": "- Feedback: No worries. Try this one again step by step.",
            "feedback_wrong": "- Feedback: Nice try. {hint}",
            "knowledge_point": "- Knowledge point: {text}",
            "why_wrong": "- Why your answer is not correct: {text}",
            "why_correct": "- Why the correct answer works: {text}",
            "hint_option": "You chose option {student_opt}, but the best match is option {answer_opt}.",
            "hint_generic": "Compare the key words in the question with each option, then eliminate two unlikely choices first.",
            "why_wrong_generic": "Your option does not match the key clue in the stem as closely as the correct option.",
            "why_correct_generic": "The correct option aligns more directly with the requirement in the question.",
            "next_step": "Next step:",
            "next_step_1": "- Revisit the incorrect questions and explain why the correct option is right in one sentence.",
            "next_step_2": "- Then try one similar question without looking at notes.",
        },
        "zh": {
            "title": "## 测验反馈",
            "score": "得分",
            "encouragement_high": "整体表现很棒，继续保持。",
            "encouragement_mid": "进步很明显，继续加油。",
            "encouragement_low": "你正在一步一步建立理解，这很不错。",
            "unanswered": "未作答",
            "per_question": "## 逐题反馈",
            "q_title": "### 第{idx}题",
            "q_label": "- 题目：{text}",
            "your_answer": "- 你的答案：{text}",
            "no_answer": "- 你的答案：（未作答）",
            "correct_answer": "- 正确答案：{text}",
            "result_correct": "- 结果：回答正确",
            "result_wrong": "- 结果：暂时不正确",
            "feedback_correct": "- 反馈：回答得很好，你已经掌握了这个知识点。",
            "feedback_unanswered": "- 反馈：没关系，这题可以按步骤再试一次。",
            "feedback_wrong": "- 反馈：这次很接近了。{hint}",
            "knowledge_point": "- 知识点：{text}",
            "why_wrong": "- 你这次为什么不对：{text}",
            "why_correct": "- 为什么正确答案更合适：{text}",
            "hint_option": "你选择了选项{student_opt}，更匹配题意的是选项{answer_opt}。",
            "hint_generic": "先抓住题目关键词，再排除两个明显不合适的选项。",
            "why_wrong_generic": "你的选项和题干关键线索匹配度不够高。",
            "why_correct_generic": "正确选项与题目要求更直接一致。",
            "next_step": "下一步：",
            "next_step_1": "- 把答错的题再看一遍，并用一句话说明为什么正确答案是对的。",
            "next_step_2": "- 然后不看笔记再做一道同类型题。",
        },
        "fr": {
            "title": "## Retour du quiz",
            "score": "Score",
            "encouragement_high": "Excellent travail dans l'ensemble.",
            "encouragement_mid": "Bon progres, continue comme ca.",
            "encouragement_low": "Tu construis ta comprehension, etape par etape.",
            "unanswered": "Sans reponse",
            "per_question": "## Retour question par question",
            "q_title": "### Q{idx}",
            "q_label": "- Question : {text}",
            "your_answer": "- Ta reponse : {text}",
            "no_answer": "- Ta reponse : (pas de reponse)",
            "correct_answer": "- Bonne reponse : {text}",
            "result_correct": "- Resultat : Correct",
            "result_wrong": "- Resultat : Pas encore correct",
            "feedback_correct": "- Retour : Bravo, tu as bien compris ce point.",
            "feedback_unanswered": "- Retour : Pas grave. Reprends cette question pas a pas.",
            "feedback_wrong": "- Retour : Bien essaye. {hint}",
            "knowledge_point": "- Point de connaissance : {text}",
            "why_wrong": "- Pourquoi ta reponse n'est pas correcte : {text}",
            "why_correct": "- Pourquoi la bonne reponse est correcte : {text}",
            "hint_option": "Tu as choisi l'option {student_opt}, mais la meilleure correspondance est l'option {answer_opt}.",
            "hint_generic": "Compare les mots-cles de la question avec chaque option, puis elimine d'abord deux options peu probables.",
            "why_wrong_generic": "Ton option correspond moins bien a l'indice principal de l'enonce.",
            "why_correct_generic": "La bonne option correspond plus directement a la consigne.",
            "next_step": "Prochaine etape :",
            "next_step_1": "- Revois les questions incorrectes et explique en une phrase pourquoi la bonne option est correcte.",
            "next_step_2": "- Puis essaie une question similaire sans regarder tes notes.",
        },
    }[ui_lang]

    total = len(input_data.questions)
    if total <= 0:
        raise RuntimeError("No quiz questions were submitted for evaluation.")

    def _norm(s: str) -> str:
        return re.sub(r"\s+", " ", (s or "").strip()).lower()

    def _display_answer(answer: str) -> str:
        raw = (answer or "").strip()
        if raw and raw != _MISSING_REFERENCE_ANSWER:
            return raw
        if ui_lang == "zh":
            return "参考答案待补充"
        if ui_lang == "fr":
            return "Reponse de reference a completer"
        return "Reference answer pending"

    def _extract_tokens(text: str) -> list[str]:
        return [t for t in re.findall(r"[a-z0-9^]+", (text or "").lower()) if len(t) >= 2]

    def _infer_knowledge_point(stem: str, options: list[str]) -> str:
        joined = f"{stem} {' '.join(options)}".lower()
        if re.search(r"(factor|factoring|factorise|factorize|因式|因数)", joined):
            return "Factoring / 因式分解" if ui_lang != "fr" else "Factorisation"
        if re.search(r"(fraction|分数)", joined):
            return "Fractions / 分数" if ui_lang != "fr" else "Fractions"
        if re.search(r"(quadratic|x\^2|二次)", joined):
            return "Quadratic expressions / 二次表达式" if ui_lang != "fr" else "Expressions quadratiques"
        if re.search(r"(equation|solve|方程|求解)", joined):
            return "Equation solving / 方程求解" if ui_lang != "fr" else "Resolution d'equations"
        if re.search(r"(algebra|expression|代数|表达式)", joined):
            return "Algebraic expressions / 代数表达式" if ui_lang != "fr" else "Expressions algebriques"
        return (
            "Core concept in this question"
            if ui_lang == "en"
            else ("本题核心概念" if ui_lang == "zh" else "Concept central de la question")
        )

    def _build_specific_explanation(stem: str, student: str, answer: str, options: list[str]) -> tuple[str, str]:
        stem_tokens = _extract_tokens(stem)
        focus = stem_tokens[:5]
        student_hits = [tok for tok in focus if tok in _norm(student)]
        answer_hits = [tok for tok in focus if tok in _norm(answer)]
        focus_text = ", ".join(focus) if focus else (
            "question clues" if ui_lang == "en" else ("题干线索" if ui_lang == "zh" else "indices de l'enonce")
        )
        student_match = ", ".join(student_hits) if student_hits else (
            "none" if ui_lang == "en" else ("较少" if ui_lang == "zh" else "faible")
        )
        answer_match = ", ".join(answer_hits) if answer_hits else (
            "stronger alignment" if ui_lang == "en" else ("更高匹配" if ui_lang == "zh" else "meilleure correspondance")
        )

        if ui_lang == "zh":
            why_wrong = (
                f"题干关键线索是：{focus_text}。你选择的“{student}”与这些线索的对应较弱（匹配：{student_match}）。"
                if student
                else "你未作答，因此没有体现对题干关键线索的判断。"
            )
            why_correct = f"正确答案“{answer}”与题干线索更一致（匹配：{answer_match}），所以更符合题目要求。"
            return why_wrong, why_correct

        if ui_lang == "fr":
            why_wrong = (
                f"L'enonce met l'accent sur : {focus_text}. Ton choix '{student}' correspond moins a ces indices (correspondance : {student_match})."
                if student
                else "Tu n'as pas repondu, donc l'analyse des indices de l'enonce n'apparait pas."
            )
            why_correct = f"La bonne reponse '{answer}' correspond mieux aux indices de l'enonce (correspondance : {answer_match})."
            return why_wrong, why_correct

        why_wrong = (
            f"The stem emphasizes: {focus_text}. Your choice '{student}' matches those clues weakly (match: {student_match})."
            if student
            else "No answer was submitted, so the key clues in the stem were not applied."
        )
        why_correct = f"The correct answer '{answer}' aligns better with those stem clues (match: {answer_match})."
        return why_wrong, why_correct

    correct = 0
    feedback_rows: list[str] = []
    unanswered_indexes: list[int] = []
    for idx, q in enumerate(input_data.questions, start=1):
        student = (q.studentAnswer or "").strip()
        answer = (q.correctAnswer or "").strip()
        shown_answer = _display_answer(answer)
        stem = (q.question or "").strip()
        stem_short = stem if len(stem) <= 120 else f"{stem[:117]}..."
        options = [o.strip() for o in (q.options or []) if o and o.strip()]
        knowledge_point = _infer_knowledge_point(stem, options)
        if not student:
            unanswered_indexes.append(idx)
            why_wrong, why_correct = _build_specific_explanation(stem_short, student, answer, options)
            feedback_rows.extend(
                [
                    copy["q_title"].format(idx=idx),
                    copy["q_label"].format(text=stem_short),
                    copy["no_answer"],
                    copy["correct_answer"].format(text=shown_answer),
                    copy["feedback_unanswered"],
                    copy["knowledge_point"].format(text=knowledge_point),
                    copy["why_wrong"].format(text=why_wrong),
                    copy["why_correct"].format(text=why_correct),
                    "",
                ]
            )
            continue
        if _norm(student) == _norm(answer):
            correct += 1
            feedback_rows.extend(
                [
                    copy["q_title"].format(idx=idx),
                    copy["q_label"].format(text=stem_short),
                    copy["your_answer"].format(text=student),
                    copy["result_correct"],
                    copy["feedback_correct"],
                    "",
                ]
            )
            continue

        hint = ""
        if options:
            if any(_norm(answer) == _norm(opt) for opt in options):
                answer_idx = next((i for i, opt in enumerate(options) if _norm(answer) == _norm(opt)), None)
                student_idx = next((i for i, opt in enumerate(options) if _norm(student) == _norm(opt)), None)
                if answer_idx is not None and student_idx is not None:
                    hint = copy["hint_option"].format(
                        student_opt=chr(ord("A") + student_idx),
                        answer_opt=chr(ord("A") + answer_idx),
                    )
        if not hint:
            hint = copy["hint_generic"]
        why_wrong, why_correct = _build_specific_explanation(stem_short, student, answer, options)

        feedback_rows.extend(
            [
                copy["q_title"].format(idx=idx),
                copy["q_label"].format(text=stem_short),
                copy["your_answer"].format(text=student),
                copy["correct_answer"].format(text=shown_answer),
                copy["result_wrong"],
                copy["feedback_wrong"].format(hint=hint),
                copy["knowledge_point"].format(text=knowledge_point),
                copy["why_wrong"].format(text=why_wrong or copy["why_wrong_generic"]),
                copy["why_correct"].format(text=why_correct or copy["why_correct_generic"]),
                "",
            ]
        )

    score = round((correct / total) * 100)
    encouragement = (
        copy["encouragement_high"]
        if score >= 85
        else (copy["encouragement_mid"] if score >= 60 else copy["encouragement_low"])
    )
    lines = [
        copy["title"],
        "",
        f"{copy['score']}: {correct}/{total} ({score}%)",
        encouragement,
    ]
    if unanswered_indexes:
        lines.append(f"{copy['unanswered']}: {', '.join(str(i) for i in unanswered_indexes)}")
    lines.extend(["", copy["per_question"], ""])
    lines.extend(feedback_rows)
    lines.extend(
        [
            copy["next_step"],
            copy["next_step_1"],
            copy["next_step_2"],
        ]
    )

    return KnowledgeTonightCommandResponse(
        reply="\n".join(lines).strip(),
        source="demo-fallback",
    )


def build_eval_quiz_prompt(input_data: EvalQuizRequest) -> str:
    ui_lang = normalize_ui_lang(getattr(input_data, "uiLang", "en"))
    lang_name = reply_language_name(ui_lang)
    rows: list[dict[str, Any]] = []
    for i, q in enumerate(input_data.questions, start=1):
        has_reference_answer = (q.correctAnswer or "").strip() not in {"", _MISSING_REFERENCE_ANSWER}
        rows.append(
            {
                "index": i,
                "questionType": q.questionType,
                "question": q.question,
                "options": q.options,
                "correctAnswer": q.correctAnswer if has_reference_answer else "",
                "hasReferenceAnswer": has_reference_answer,
                "studentAnswer": q.studentAnswer,
            }
        )

    scaffold = {
        "en": [
            "Use markdown with this structure exactly:",
            "## Quiz Feedback",
            "Score: X/Y (Z%)",
            "1 short encouragement sentence.",
            "",
            "## Per-question feedback",
            "### Q1",
            "- Question: ...",
            "- Your answer: ...",
            "- Correct answer: ... (omit only when already correct and concise)",
            "- Result: Correct / Not correct yet / Unanswered",
            "- Knowledge point: ...",
            "- Why your answer is not correct: ... (for wrong/unanswered)",
            "- Why the correct answer works: ... (for wrong/unanswered)",
            "- Feedback: ...",
            "",
            "Next step:",
            "- ...",
            "- ...",
        ],
        "zh": [
            "严格使用以下 Markdown 结构：",
            "## 测验反馈",
            "得分: X/Y (Z%)",
            "1句简短鼓励。",
            "",
            "## 逐题反馈",
            "### 第1题",
            "- 题目：...",
            "- 你的答案：...",
            "- 正确答案：...（若本题答对且内容简洁可省略）",
            "- 结果：回答正确 / 暂时不正确 / 未作答",
            "- 知识点：...",
            "- 你这次为什么不对：...（仅错题/未作答）",
            "- 为什么正确答案更合适：...（仅错题/未作答）",
            "- 反馈：...",
            "",
            "下一步：",
            "- ...",
            "- ...",
        ],
        "fr": [
            "Utilise exactement cette structure Markdown :",
            "## Retour du quiz",
            "Score : X/Y (Z%)",
            "1 courte phrase d'encouragement.",
            "",
            "## Retour question par question",
            "### Q1",
            "- Question : ...",
            "- Ta reponse : ...",
            "- Bonne reponse : ... (peut etre omise si deja correcte et concise)",
            "- Resultat : Correct / Pas encore correct / Sans reponse",
            "- Point de connaissance : ...",
            "- Pourquoi ta reponse n'est pas correcte : ... (seulement faux/sans reponse)",
            "- Pourquoi la bonne reponse est correcte : ... (seulement faux/sans reponse)",
            "- Retour : ...",
            "",
            "Prochaine etape :",
            "- ...",
            "- ...",
        ],
    }[ui_lang]

    return "\n".join(
        [
            "You are BridgeEd AI evaluating a child's completed quiz.",
            f"Write the full final feedback in {lang_name}.",
            f"IMPORTANT: Every label/headline must be in {lang_name} only.",
            "Do not keep English field labels unless the language is English.",
            "Translate question stems and answer texts into the target language when needed; keep formulas/symbols unchanged.",
            "Goal: be specific, kind, and educational.",
            "For each question:",
            "- If correct: praise briefly and name what was done right.",
            "- If wrong: explain why the student's answer is not correct, why the correct answer is better, and what concept is being tested.",
            "- If unanswered: gently encourage and explain what to look for next time.",
            "- If hasReferenceAnswer is false, first infer a brief reasonable reference answer from the question/options, then evaluate.",
            *scaffold,
            "Do not output JSON.",
            "Quiz data (JSON):",
            json.dumps({"uiLang": ui_lang, "questions": rows}, ensure_ascii=False),
        ]
    )


def evaluate_structured_quiz_with_curricullm(input_data: EvalQuizRequest) -> KnowledgeTonightCommandResponse:
    api_url = get_env("CURRICULLM_API_URL")
    api_key = get_env("CURRICULLM_API_KEY")
    model = get_env("CURRICULLM_MODEL", "CurricuLLM-AU")
    auth_header = get_env("CURRICULLM_AUTH_HEADER", "Authorization")
    auth_scheme = get_env("CURRICULLM_AUTH_SCHEME", "Bearer")

    response = requests.post(
        api_url,
        headers={
            "Content-Type": "application/json",
            auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
        },
        json={
            "model": model,
            "temperature": 0.35,
            "top_p": 0.9,
            "max_tokens": 9000,
            "messages": [
                {
                    "role": "system",
                    "content": "You are BridgeEd AI, a supportive K-12 learning feedback assistant.",
                },
                {
                    "role": "user",
                    "content": build_eval_quiz_prompt(input_data),
                },
            ],
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content")
        or data.get("output_text")
        or data.get("content")
        or data.get("result")
    )
    if isinstance(content, dict):
        content = content.get("reply") or content.get("text") or ""
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("CurricuLLM eval-quiz response did not contain usable content.")
    reply = content.strip()
    ui_lang = normalize_ui_lang(getattr(input_data, "uiLang", "en"))
    if ui_lang in {"zh", "fr"}:
        pairs = (
            [
                (r"(?im)^##\s*Quiz Feedback\s*$", "## 测验反馈"),
                (r"(?im)^##\s*Per-question feedback\s*$", "## 逐题反馈"),
                (r"(?im)^\s*Score\s*:", "得分:"),
                (r"(?im)^\s*Next step\s*:", "下一步:"),
                (r"(?im)^\s*-\s*Question\s*:", "- 题目:"),
                (r"(?im)^\s*-\s*Your answer\s*:", "- 你的答案:"),
                (r"(?im)^\s*-\s*Correct answer\s*:", "- 正确答案:"),
                (r"(?im)^\s*-\s*Result\s*:", "- 结果:"),
                (r"(?im)^\s*-\s*Knowledge point\s*:", "- 知识点:"),
                (r"(?im)^\s*-\s*Why your answer is not correct\s*:", "- 你这次为什么不对:"),
                (r"(?im)^\s*-\s*Why the correct answer works\s*:", "- 为什么正确答案更合适:"),
                (r"(?im)^\s*-\s*Feedback\s*:", "- 反馈:"),
            ]
            if ui_lang == "zh"
            else [
                (r"(?im)^##\s*Quiz Feedback\s*$", "## Retour du quiz"),
                (r"(?im)^##\s*Per-question feedback\s*$", "## Retour question par question"),
                (r"(?im)^\s*Score\s*:", "Score :"),
                (r"(?im)^\s*Next step\s*:", "Prochaine etape :"),
                (r"(?im)^\s*-\s*Question\s*:", "- Question :"),
                (r"(?im)^\s*-\s*Your answer\s*:", "- Ta reponse :"),
                (r"(?im)^\s*-\s*Correct answer\s*:", "- Bonne reponse :"),
                (r"(?im)^\s*-\s*Result\s*:", "- Resultat :"),
                (r"(?im)^\s*-\s*Knowledge point\s*:", "- Point de connaissance :"),
                (r"(?im)^\s*-\s*Why your answer is not correct\s*:", "- Pourquoi ta reponse n'est pas correcte :"),
                (r"(?im)^\s*-\s*Why the correct answer works\s*:", "- Pourquoi la bonne reponse est correcte :"),
                (r"(?im)^\s*-\s*Feedback\s*:", "- Retour :"),
            ]
        )
        for pattern, repl in pairs:
            reply = re.sub(pattern, repl, reply)
    return KnowledgeTonightCommandResponse(reply=reply, source="curricullm")


def evaluate_structured_quiz(input_data: EvalQuizRequest) -> KnowledgeTonightCommandResponse:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
    try:
        return evaluate_structured_quiz_with_curricullm(input_data)
    except Exception as exc:
        if not allow_fallback:
            raise
        fallback = evaluate_structured_quiz_fallback(input_data)
        return fallback.model_copy(update={"warning": str(exc)})


def stream_respond_with_curricullm(input_data: ChatRespondRequest) -> Iterator[str]:
    api_url = get_env("CURRICULLM_API_URL")
    api_key = get_env("CURRICULLM_API_KEY")
    model = get_env("CURRICULLM_MODEL", "CurricuLLM-AU")
    auth_header = get_env("CURRICULLM_AUTH_HEADER", "Authorization")
    auth_scheme = get_env("CURRICULLM_AUTH_SCHEME", "Bearer")

    is_quiz = _is_make_quiz_message(input_data.message)
    is_teach_back = bool(re.match(r"^/?teach-?back(\b|$)", input_data.message.strip().lower()))
    temperature = 0.7 if is_quiz else (0.65 if is_teach_back else 0.4)

    response = requests.post(
        api_url,
        headers={
            "Content-Type": "application/json",
            auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
        },
        json={
            "model": model,
            "stream": True,
            "temperature": temperature,
            "top_p": 0.9,
            "max_tokens": 5000,
            "messages": [
                {
                    "role": "system",
                    "content": "You are BridgeEd AI, a school-home communication assistant.",
                },
                {
                    "role": "user",
                    "content": build_chat_prompt(input_data),
                },
            ],
        },
        timeout=60,
        stream=True,
    )
    response.raise_for_status()

    for raw_line in response.iter_lines(decode_unicode=False):
        if not raw_line:
            continue
        if isinstance(raw_line, bytes):
            line = raw_line.decode("utf-8", errors="replace").strip()
        else:
            line = str(raw_line).strip()
        if not line.startswith("data:"):
            continue
        payload = line[5:].strip()
        if payload == "[DONE]":
            break
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            continue
        delta = data.get("choices", [{}])[0].get("delta", {}).get("content")
        if isinstance(delta, str) and delta:
            yield delta


def respond_in_chat(input_data: ChatRespondRequest) -> ChatRespondResponse:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
    try:
        return respond_with_curricullm(input_data)
    except Exception as exc:
        logger.exception(
            "Falling back to demo chat response: ui_lang=%s role=%s thread_id=%s message=%s allow_fallback=%s",
            normalize_ui_lang(getattr(input_data, "uiLang", "en")),
            input_data.role,
            input_data.threadId,
            _log_preview(input_data.message, 160),
            allow_fallback,
        )
        if not allow_fallback:
            raise
        fallback = build_chat_fallback(input_data)
        return fallback.model_copy(update={"warning": str(exc)})


def stream_respond_in_chat(input_data: ChatRespondRequest) -> Iterator[str]:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
    is_quiz = _is_make_quiz_message(input_data.message)
    is_practice = bool(re.match(r"^/?practice(\b|$)", input_data.message.strip().lower()))
    # /make-quiz must include answer key reliably.
    # /practice also benefits from non-stream normalization so markdown section
    # headings render correctly in chat.
    # Use non-stream path so normalization + validation always applies.
    if is_quiz or is_practice:
        try:
            result = respond_with_curricullm(input_data)
            if result.reply:
                yield result.reply
            return
        except Exception:
            logger.exception(
                "Falling back to demo quiz stream response: ui_lang=%s role=%s thread_id=%s message=%s allow_fallback=%s",
                normalize_ui_lang(getattr(input_data, "uiLang", "en")),
                input_data.role,
                input_data.threadId,
                _log_preview(input_data.message, 160),
                allow_fallback,
            )
            if not allow_fallback:
                raise
            fallback = build_chat_fallback(input_data)
            if fallback.reply:
                yield fallback.reply
            return

    try:
        yielded = False
        for chunk in stream_respond_with_curricullm(input_data):
            yielded = True
            yield chunk
        if not yielded:
            result = respond_with_curricullm(input_data)
            if result.reply:
                yield result.reply
    except Exception:
        if not allow_fallback:
            raise
        fallback = build_chat_fallback(input_data)
        if fallback.reply:
            yield fallback.reply


def respond_knowledge_tonight(command: str, card_title: str) -> KnowledgeTonightCommandResponse:
    prompt_map = {
        "quiz": "/make-quiz",
        "practice": "/practice",
        "teach-back": "/teach-back",
    }
    cmd = prompt_map.get(command, "/make-quiz")
    result = respond_in_chat(
        ChatRespondRequest(
            role="student",
            threadTitle=card_title or "Knowledge",
            threadId=f"knowledge-tonight-{command}",
            message=cmd,
            history=[],
        )
    )
    return KnowledgeTonightCommandResponse(reply=result.reply, source=result.source, warning=result.warning)


def build_translate_prompt(input_data: TranslateTextRequest) -> str:
    target = input_data.language.strip()
    source = input_data.sourceLanguage.strip() or "auto"
    return "\n".join(
        [
            "You are a precise translation assistant.",
            "Translate the input text into the target language.",
            "Keep meaning, tone, and formatting (line breaks, bullets, markdown) as much as possible.",
            "Do not add explanations.",
            f"Target language: {target}",
            f"Source language hint: {source}",
            "Return only translated text.",
            "Text:",
            input_data.text,
        ]
    )


def translate_text_with_curricullm(input_data: TranslateTextRequest) -> TranslateTextResponse:
    api_url = get_env("CURRICULLM_API_URL")
    api_key = get_env("CURRICULLM_API_KEY")
    model = get_env("CURRICULLM_MODEL", "CurricuLLM-AU")
    auth_header = get_env("CURRICULLM_AUTH_HEADER", "Authorization")
    auth_scheme = get_env("CURRICULLM_AUTH_SCHEME", "Bearer")

    response = requests.post(
        api_url,
        headers={
            "Content-Type": "application/json",
            auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
        },
        json={
            "model": model,
            "temperature": 0.1,
            "top_p": 1,
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a translation engine. Output translated text only.",
                },
                {
                    "role": "user",
                    "content": build_translate_prompt(input_data),
                },
            ],
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    content = (
        data.get("choices", [{}])[0].get("message", {}).get("content")
        or data.get("output_text")
        or data.get("content")
        or data.get("result")
    )
    if isinstance(content, dict):
        content = content.get("translatedText") or content.get("text") or content.get("reply") or ""
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("CurricuLLM translate response did not contain usable content.")
    return TranslateTextResponse(translatedText=content.strip(), source="curricullm")


def translate_text(input_data: TranslateTextRequest) -> TranslateTextResponse:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
    try:
        return translate_text_with_curricullm(input_data)
    except Exception as exc:
        if not allow_fallback:
            raise
        # Safe fallback: return original text unchanged when LLM unavailable.
        return TranslateTextResponse(
            translatedText=input_data.text,
            source="demo-fallback",
            warning=str(exc),
        )
