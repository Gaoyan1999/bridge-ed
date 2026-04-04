from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

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


def create_card(input_data: LearningCardCreate) -> LearningCard:
    timestamp = utc_now_iso()
    card = LearningCard(
        id=str(uuid4()),
        title=input_data.title.strip(),
        teacherSummary=input_data.teacherSummary.strip(),
        parentActions=[item.strip() for item in input_data.parentActions if item.strip()],
        createdAt=timestamp,
        updatedAt=timestamp,
    )
    cards = list_cards()
    cards.append(card)
    _write_cards(cards)
    return card


def update_card(card_id: str, input_data: LearningCardCreate) -> LearningCard | None:
    cards = list_cards()
    updated: LearningCard | None = None
    next_cards: list[LearningCard] = []
    for card in cards:
        if card.id == card_id:
            updated = LearningCard(
                id=card.id,
                title=input_data.title.strip(),
                teacherSummary=input_data.teacherSummary.strip(),
                parentActions=[item.strip() for item in input_data.parentActions if item.strip()],
                createdAt=card.createdAt,
                updatedAt=utc_now_iso(),
            )
            next_cards.append(updated)
        else:
            next_cards.append(card)
    if updated is None:
        return None
    _write_cards(next_cards)
    return updated


def delete_card(card_id: str) -> bool:
    cards = list_cards()
    next_cards = [card for card in cards if card.id != card_id]
    if len(next_cards) == len(cards):
        return False
    _write_cards(next_cards)
    return True
