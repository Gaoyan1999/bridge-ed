from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
from typing import Any

from .models import LearningCard, LearningCardCreate


DATA_DIR = Path(__file__).with_name("data")
DATA_FILE = DATA_DIR / "learning-cards.json"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_store() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text("[]\n", encoding="utf-8")


def list_cards() -> list[LearningCard]:
    _ensure_store()
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    cards = [LearningCard.model_validate(item) for item in data]
    return sorted(cards, key=lambda item: item.createdAt, reverse=True)


def get_card(card_id: str) -> LearningCard | None:
    for card in list_cards():
        if card.id == card_id:
            return card
    return None


def _write_cards(cards: list[LearningCard]) -> None:
    _ensure_store()
    payload = [card.model_dump() for card in cards]
    DATA_FILE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _normalize_legacy_fields(payload: dict[str, Any]) -> dict[str, Any]:
    # Accept legacy card shape while storing canonical fields used by the frontend.
    if not payload.get("topic"):
        legacy_title = payload.get("title")
        if isinstance(legacy_title, str):
            payload["topic"] = legacy_title
    if not payload.get("parentSummary"):
        legacy_summary = payload.get("teacherSummary")
        if isinstance(legacy_summary, str):
            payload["parentSummary"] = legacy_summary
    if "tonightActions" not in payload:
        legacy_actions = payload.get("parentActions")
        if isinstance(legacy_actions, list):
            payload["tonightActions"] = [{"preset": "quiz", "include": True, "text": str(v)} for v in legacy_actions]
    return payload


def _build_learning_card(payload: dict[str, Any], *, card_id: str | None = None, keep_created_at: str | None = None) -> LearningCard:
    now = utc_now_iso()
    payload = _normalize_legacy_fields(payload)
    payload["id"] = card_id or str(payload.get("id") or uuid4())
    payload["createdAt"] = keep_created_at or str(payload.get("createdAt") or now)
    payload["updatedAt"] = now
    return LearningCard.model_validate(payload)


def create_card(input_data: LearningCardCreate) -> LearningCard:
    payload = input_data.model_dump(exclude_none=True)
    card = _build_learning_card(payload)
    cards = list_cards()
    cards.append(card)
    _write_cards(cards)
    return card


def update_card(card_id: str, input_data: LearningCardCreate) -> LearningCard:
    cards = list_cards()
    updated: LearningCard | None = None
    next_cards: list[LearningCard] = []
    payload = input_data.model_dump(exclude_none=True)
    for card in cards:
        if card.id == card_id:
            updated = _build_learning_card(payload, card_id=card.id, keep_created_at=card.createdAt)
            next_cards.append(updated)
        else:
            next_cards.append(card)
    if updated is None:
        updated = _build_learning_card(payload, card_id=card_id)
        next_cards.append(updated)
    _write_cards(next_cards)
    return updated


def delete_card(card_id: str) -> bool:
    cards = list_cards()
    next_cards = [card for card in cards if card.id != card_id]
    if len(next_cards) == len(cards):
        return False
    _write_cards(next_cards)
    return True
