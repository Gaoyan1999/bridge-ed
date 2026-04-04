from __future__ import annotations

import json
from typing import Any

import requests

from .config import get_bool_env, get_env
from .models import (
    ChatRespondRequest,
    ChatRespondResponse,
    LearningCardGenerateRequest,
    LearningCardGenerateResponse,
    TranslatedSummaries,
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
        f"Dans {class_title}, les élèves ont travaillé sur {topic} en {subject} ({grade}). "
        f"Les familles peuvent aider en vérifiant la compréhension avec des mots simples et en gardant des séances courtes. "
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
            "Respond with valid JSON only using this schema:",
            '{"translatedSummaries":{"zh":"string","en":"string","fr":"string"},"actions":["string","string","string"]}',
            "Requirements:",
            "- Provide complete parent-facing summary text in zh, en, and fr.",
            "- Use plain language for parents.",
            "- Keep the advice practical and realistic for busy families.",
            "- Make actions specific, short, and supportive.",
            "- Avoid jargon where possible.",
            f"Class / lesson: {input_data.classTitle}",
            f"Grade: {input_data.grade}",
            f"Subject: {input_data.subject}",
            f"Topic: {input_data.topic}",
            f"Teacher notes: {input_data.notes}",
        ]
    )


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
            "messages": [
                {
                    "role": "system",
                    "content": "You convert teacher input into parent-friendly communication aligned to school context.",
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


def build_chat_fallback(input_data: ChatRespondRequest) -> ChatRespondResponse:
    role_copy = {
        "parent": "I can help turn this into a parent-friendly next step.",
        "student": "I can help with a simple explanation and what to do next.",
        "teacher": "I can help draft a clear, family-friendly response.",
    }
    lead = role_copy.get(input_data.role, "I can help with this message.")
    thread_hint = f"Thread: {input_data.threadTitle}. " if input_data.threadTitle else ""
    return ChatRespondResponse(
        reply=(
            f"{lead} {thread_hint}"
            f"You asked: {input_data.message.strip()}\n\n"
            "Suggested reply:\n"
            "1. Acknowledge the question in plain language.\n"
            "2. Give one clear next step for home.\n"
            "3. Offer a short follow-up if the learner is still stuck."
        ),
        source="demo-fallback",
    )


def build_chat_prompt(input_data: ChatRespondRequest) -> str:
    history_lines = []
    for msg in input_data.history[-8:]:
        speaker = "User" if msg.type == "out" else msg.who
        history_lines.append(f"{speaker}: {msg.text}")

    return "\n".join(
        [
            "You are BridgeEd AI inside the chat workspace.",
            "Help teachers, parents, and students communicate clearly about learning.",
            "Keep replies concise, helpful, and action-oriented.",
            "If the user is a parent, use plain language and practical home support.",
            "If the user is a teacher, draft a professional but warm response.",
            "If the user is a student, keep it supportive and age-appropriate.",
            f"Role: {input_data.role}",
            f"Thread title: {input_data.threadTitle}",
            f"Latest user message: {input_data.message}",
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

    response = requests.post(
        api_url,
        headers={
            "Content-Type": "application/json",
            auth_header: f"{auth_scheme} {api_key}" if auth_scheme else api_key,
        },
        json={
            "model": model,
            "temperature": 0.4,
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

    return ChatRespondResponse(reply=content.strip(), source="curricullm")


def respond_in_chat(input_data: ChatRespondRequest) -> ChatRespondResponse:
    allow_fallback = get_bool_env("CURRICULLM_ALLOW_FALLBACK", True)
    try:
        return respond_with_curricullm(input_data)
    except Exception as exc:
        if not allow_fallback:
            raise
        fallback = build_chat_fallback(input_data)
        return fallback.model_copy(update={"warning": str(exc)})
