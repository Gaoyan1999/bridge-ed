from __future__ import annotations

import json
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
    TranslatedSummaries,
)

# Knowledge slash command: `/make-quiz` (preferred). Legacy `/quiz` still matched for old threads.
_MATCH_MAKE_QUIZ = re.compile(r"^/?(?:make-quiz|quiz)(\b|$)", re.IGNORECASE)


def _is_make_quiz_message(text: str) -> bool:
    return bool(_MATCH_MAKE_QUIZ.match((text or "").strip()))


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
        f"Dans {class_title}, les 閼煎崹閻氱幗es ont travaill閼?sur {topic} en {subject} ({grade}). "
        f"Les familles peuvent aider en v閼煎嵐ifiant la compr閼煎崣ension avec des mots simples et en gardant des s閼煎崋nces courtes. "
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
        heading = "## Quick Quiz" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Quiz rapide")
        key_heading = "## Answer Key" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Corrige")
        variant = quiz_round % 3
        if variant == 1:
            q1 = f"1. Which factorization is correct for (x^2 + 7x + 10) in {subject}?"
            a1 = ("   - A) (x + 5)(x + 2)\n   - B) (x + 10)(x + 1)\n   - C) (x + 3)(x + 4)\n   - D) (x + 6)(x + 1)")
            k = ["1. A - (x + 5)(x + 2) expands to x^2 + 7x + 10."]
        elif variant == 2:
            q1 = f"1. For {grade}, what is the first check before factoring (x^2 + 5x + 6)?"
            a1 = ("   - A) Look for a common factor first\n   - B) Divide by x immediately\n   - C) Move all terms to the right\n   - D) Ignore the middle term")
            k = ["1. A - Checking for a greatest common factor is the best first step."]
        else:
            q1 = f"1. Which expression is a difference of squares related to {topic}?"
            a1 = ("   - A) x^2 - 9\n   - B) x^2 + 9\n   - C) x^2 + 6x + 9\n   - D) x^2 + x")
            k = ["1. A - x^2 - 9 matches a^2 - b^2."]
        return ChatRespondResponse(
            reply=(
                f"{heading}\n"
                f"\n{q1}\n"
                f"{a1}\n\n"
                f"2. For {grade}, what is a good first step when solving a {topic} question?\n"
                "   - A) Skip reading and guess quickly.\n"
                "   - B) Identify what the question is asking.\n"
                "   - C) Write a long paragraph first.\n"
                "   - D) Memorize without checking meaning.\n\n"
                f"3. Which example is most connected to {topic}?\n"
                "   - A) An example that uses the same key terms and process.\n"
                "   - B) A random fact from another subject.\n"
                "   - C) A story with no learning goal.\n"
                "   - D) A topic with no overlap.\n\n"
                f"4. If a student is stuck on {topic}, what is the best next move?\n"
                "   - A) Stop immediately and do nothing.\n"
                "   - B) Break the problem into smaller steps and try one step at a time.\n"
                "   - C) Copy an answer without understanding.\n"
                "   - D) Ignore teacher notes.\n\n"
                f"5. What is the strongest sign that {topic} is understood?\n"
                "   - A) The student can explain the idea in their own words.\n"
                "   - B) The student can only repeat one sentence.\n"
                "   - C) The student avoids all questions.\n"
                "   - D) The student never checks mistakes.\n\n"
                f"{key_heading}\n"
                f"\n{k[0]}\n"
                "2. B - Understanding the prompt first improves accuracy.\n"
                "3. A - Closely related examples reinforce transfer.\n"
                "4. B - Step-by-step decomposition reduces confusion.\n"
                "5. A - Teach-back shows genuine understanding."
            ),
            source="demo-fallback",
        )
    if is_practice:
        topic = (input_data.cardContext.topic if input_data.cardContext else "").strip() or input_data.threadTitle or "this topic"
        subject = (input_data.cardContext.subject if input_data.cardContext else "").strip() or "the subject"
        grade = (input_data.cardContext.grade if input_data.cardContext else "").strip() or "the student"
        heading = "## Hands-on Practice" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Pratique manuelle")
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
                    "## ??????\n\n"
                    f"???{topic}?{subject}?{grade}?\n\n"
                    "### ??\n"
                    "???????????????????????????\n\n"
                    "### ?????\n"
                    "1. ?????????????????\n"
                    "2. ????????????????\n"
                    "3. ?????????????????\n\n"
                    "### ????\n"
                    "1. ??????????\n"
                    "2. ????????????\n"
                    "3. ?????????????\n\n"
                    "### ????\n"
                    "?????? 30 ????????????????????????"
                ),
                source="demo-fallback",
            )
        if ui_lang == "fr":
            return ChatRespondResponse(
                reply=(
                    "## Exercice Teach-back (m閼煎嵓hode Feynman)\n\n"
                    f"Sujet : {topic} ({subject}, {grade})\n\n"
                    "### Objectif\n"
                    "Explique la notion comme un mini-professeur, avec tes propres mots.\n\n"
                    "### M閼煎嵓hode en 3 閼煎嵓apes\n"
                    "1. Donne une d閼煎崝inition tr閻氱幐 simple en une phrase.\n"
                    "2. Donne un exemple concret de la vie quotidienne.\n"
                    "3. Donne une erreur fr閼煎嵍uente et comment l'閼煎嵕iter.\n\n"
                    "### Auto-v閼煎嵐ification\n"
                    "1. Quelle 閼煎嵓ape est encore floue ?\n"
                    "2. Puis-je r閼煎崘xpliquer sans regarder le cours ?\n"
                    "3. Quelle question vais-je pratiquer ensuite ?\n\n"
                    "### Cl娑斿澅ure\n"
                    "Termine par un r閼煎嵒um閼?de 30 secondes : id閼煎崘, utilisation, prochain entra閸楃棴ement."
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

    role_copy = {
        "parent": "I can help turn this into a parent-friendly next step.",
        "student": "I can help with a simple explanation and what to do next.",
        "teacher": "I can help draft a clear, family-friendly response.",
    }
    if ui_lang == "zh":
        role_copy = {
            "parent": "?????????????????????",
            "student": "????????????????????",
            "teacher": "??????????????????",
        }
    elif ui_lang == "fr":
        role_copy = {
            "parent": "Je peux transformer cela en prochaine etape claire pour les parents.",
            "student": "Je peux l'expliquer simplement avec une prochaine action.",
            "teacher": "Je peux rediger une reponse professionnelle et chaleureuse.",
        }
    lead = role_copy.get(input_data.role, role_copy.get("parent", "I can help with this message."))
    thread_hint = f"Thread: {input_data.threadTitle}. " if input_data.threadTitle else ""
    if ui_lang == "zh":
        thread_hint = f"???{input_data.threadTitle}? " if input_data.threadTitle else ""
    elif ui_lang == "fr":
        thread_hint = f"Fil : {input_data.threadTitle}. " if input_data.threadTitle else ""
    suggestion_title = "Suggested reply:" if ui_lang == "en" else ("?????" if ui_lang == "zh" else "Reponse suggeree :")
    line1 = (
        "1. Acknowledge the question in plain language."
        if ui_lang == "en"
        else ("1. ??????????????" if ui_lang == "zh" else "1. Reformulez la question en langage simple.")
    )
    line2 = (
        "2. Give one clear next step for home."
        if ui_lang == "en"
        else ("2. ????????????????" if ui_lang == "zh" else "2. Donnez une prochaine etape claire a la maison.")
    )
    line3 = (
        "3. Offer a short follow-up if the learner is still stuck."
        if ui_lang == "en"
        else ("3. ????????????????????" if ui_lang == "zh" else "3. Ajoutez un court suivi si l eleve bloque encore.")
    )
    asked_prefix = (
        "You asked: "
        if ui_lang == "en"
        else ("????????" if ui_lang == "zh" else "Vous avez demande : ")
    )
    return ChatRespondResponse(
        reply=(
            f"{lead} {thread_hint}"
            f"{asked_prefix}{input_data.message.strip()}\n\n"
            f"{suggestion_title}\n"
            f"{line1}\n"
            f"{line2}\n"
            f"{line3}"
        ),
        source="demo-fallback",
    )


def build_chat_prompt(input_data: ChatRespondRequest) -> str:
    ui_lang = normalize_ui_lang(getattr(input_data, "uiLang", "en"))
    lang_name = reply_language_name(ui_lang)
    history_lines = []
    for msg in input_data.history[-8:]:
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
    prior_teach_back_count = sum(
        1
        for m in input_data.history
        if m.type == "out" and bool(re.match(r"^/?teach-?back(\b|$)", m.text.strip().lower()))
    )
    teach_back_round = prior_teach_back_count + 1 if is_teach_back else 0

    if is_quiz:
        quiz_heading = "## Quick Quiz" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Quiz rapide")
        answer_heading = "## Answer Key" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Corrige")
        quiz_instructions = [
            "The user requested /make-quiz.",
            "Generate a quiz list directly related to the provided card context/topic.",
            "Return markdown only using this structure:",
            quiz_heading,
            "",
            "1. Question text",
            "   - A) Option",
            "   - B) Option",
            "   - C) Option",
            "   - D) Option",
            "(Repeat for 5 questions)",
            "",
            answer_heading,
            "",
            "1. B - short explanation",
            "(Repeat for all 5)",
            "Rules:",
            "- Exactly 5 multiple-choice questions.",
            "- Difficulty suitable for the student's grade.",
            "- Keep wording clear and age-appropriate.",
            "- Questions must align with topic/subject and not be generic.",
            "- Put each option on its own new line (never inline after the question sentence).",
            "- Add one blank line between questions.",
            f"- This is quiz round {quiz_round} in the same thread.",
            "- If round >= 2, generate a NEW set of 5 questions and avoid repeating prior stems/options.",
            "- Prefer different sub-skills each round (concept check, procedure, error-spotting, application, explain-why).",
        ]
    else:
        quiz_instructions = []

    if is_practice:
        practice_heading = "## Hands-on Practice" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Pratique manuelle")
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
        teach_back_heading = (
            "## Teach-back (Feynman Method)"
            if ui_lang == "en"
            else ("## 閻犳劘顫夊ù鏍媼閼肩紟鎺旂磼閸愌呯槑" if ui_lang == "zh" else "## Teach-back (m閼煎嵓hode Feynman)")
        )
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
    temperature = 0.7 if is_quiz else (0.65 if is_teach_back else 0.4)

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
                    "content": build_chat_prompt(input_data),
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
        raise RuntimeError("CurricuLLM chat response did not contain usable content.")

    reply = content.strip()
    if _is_make_quiz_message(input_data.message):
        reply = normalize_quiz_markdown(reply, normalize_ui_lang(getattr(input_data, "uiLang", "en")))

    return ChatRespondResponse(reply=reply, source="curricullm")


def normalize_quiz_markdown(text: str, ui_lang: str = "en") -> str:
    out = text.replace("\r\n", "\n")
    quiz_heading = "## Quick Quiz" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Quiz rapide")
    key_heading = "## Answer Key" if ui_lang == "en" else ("## ????" if ui_lang == "zh" else "## Corrige")

    out = re.sub(r"(?i)\bquick quiz\b", quiz_heading, out, count=1)
    out = re.sub(r"(?i)\banswer key\b", key_heading, out, count=1)
    out = re.sub(r"(?im)^quick quiz\s*$", quiz_heading, out)
    out = re.sub(r"(?im)^answer key\s*$", key_heading, out)

    out = re.sub(r"(##\s*Quick Quiz|##\s*????|##\s*Quiz rapide)\s*(\d+\.\s)", r"\1\n\n\2", out, flags=re.IGNORECASE)
    out = re.sub(r"(##\s*Answer Key|##\s*????|##\s*Corrige)\s*(\d+\.\s)", r"\1\n\n\2", out, flags=re.IGNORECASE)

    # Force A/B/C/D options onto separate lines if model emitted them inline.
    out = re.sub(r"\s+([A-D]\))", r"\n- \1", out)
    out = re.sub(r"(?m)^\s*([A-D]\))", r"- \1", out)

    # Add spacing between questions and answer-key items when they run together.
    out = re.sub(r"([^\n])\s+(\d+\.\s)", r"\1\n\n\2", out)
    out = re.sub(r"\n{3,}", "\n\n", out)

    return out.strip()


def _split_quiz_and_answer_sections(quiz_text: str) -> tuple[str, str]:
    normalized = (quiz_text or "").replace("\r\n", "\n")
    m = re.search(r"(?im)^##\s*(answer key|corrige|答案|参考答案)\s*$", normalized)
    if not m:
        return normalized, ""
    return normalized[: m.start()].strip(), normalized[m.end() :].strip()


def _strip_question_prefix(line: str) -> str:
    return re.sub(r"^\s*\d+\.\s*", "", line).strip()


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

    blocks = re.findall(r"(?ms)^\s*(\d+)\.\s*(.+?)(?=^\s*\d+\.\s|\Z)", question_section)
    questions: list[StructuredQuizQuestion] = []
    for qn_str, body in blocks:
        qn = int(qn_str)
        lines = [ln.rstrip() for ln in body.splitlines() if ln.strip()]
        if not lines:
            continue
        question_text = _strip_question_prefix(f"{qn}. {lines[0]}").strip()
        # Guard against inline options leaking into question stem.
        question_text = re.split(r"\s+[A-Da-d][\)\.\:]\s+", question_text, maxsplit=1)[0].strip()

        option_entries = _extract_option_entries(body)
        if len(option_entries) < 2:
            continue
        options = [text for _, text in option_entries]

        answer_label = key_map.get(qn)
        option_map = {label: text for label, text in option_entries}
        correct = option_map.get(answer_label or "", options[0]).strip()
        if not question_text:
            question_text = f"Question {qn}"

        questions.append(
            StructuredQuizQuestion(
                question=question_text,
                options=options,
                correctAnswer=correct,
            )
        )

    if not questions:
        raise RuntimeError("Could not parse structured quiz questions from /make-quiz text.")

    return questions[:10]


def generate_structured_quiz_from_text(quiz_text: str) -> StructuredQuizGenerateResponse:
    return StructuredQuizGenerateResponse(questions=_parse_structured_questions(quiz_text))


def evaluate_structured_quiz(input_data: EvalQuizRequest) -> KnowledgeTonightCommandResponse:
    total = len(input_data.questions)
    if total <= 0:
        raise RuntimeError("No quiz questions were submitted for evaluation.")

    correct = 0
    wrong_indexes: list[int] = []
    unanswered_indexes: list[int] = []
    for idx, q in enumerate(input_data.questions, start=1):
        student = (q.studentAnswer or "").strip()
        answer = (q.correctAnswer or "").strip()
        if not student:
            unanswered_indexes.append(idx)
            continue
        if student == answer:
            correct += 1
        else:
            wrong_indexes.append(idx)

    score = round((correct / total) * 100)
    lines = [
        "## Quiz Feedback",
        "",
        f"Score: {correct}/{total} ({score}%)",
    ]
    if unanswered_indexes:
        lines.append(f"Unanswered: {', '.join(str(i) for i in unanswered_indexes)}")
    if wrong_indexes:
        lines.append(f"Need review: {', '.join(str(i) for i in wrong_indexes)}")
    lines.extend(
        [
            "",
            "Next step:",
            "- Revisit the incorrect questions and explain why the correct option is right in one sentence.",
            "- Then try one similar example without looking at notes.",
        ]
    )

    return KnowledgeTonightCommandResponse(
        reply="\n".join(lines).strip(),
        source="demo-fallback",
    )


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
        if not allow_fallback:
            raise
        fallback = build_chat_fallback(input_data)
        return fallback.model_copy(update={"warning": str(exc)})


def stream_respond_in_chat(input_data: ChatRespondRequest) -> Iterator[str]:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
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
