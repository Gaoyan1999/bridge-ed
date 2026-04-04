from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_bool_env
from .models import LearningCard, LearningCardCreate, LearningCardGenerateRequest, LearningCardGenerateResponse
from .models import ChatRespondRequest, ChatRespondResponse
from .curricullm_service import generate_learning_card, respond_in_chat
from .storage import create_card, delete_card, get_card, list_cards, update_card


app = FastAPI(title="BridgeEd Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "bridge-ed-backend",
        "curricullmConfigured": bool(os.environ.get("CURRICULLM_API_URL") and os.environ.get("CURRICULLM_API_KEY")),
        "fallbackEnabled": get_bool_env("CURRICULLM_ALLOW_FALLBACK", True),
    }


@app.get("/learning-cards", response_model=list[LearningCard])
def learning_cards_list() -> list[LearningCard]:
    return list_cards()


@app.get("/learning-cards/{card_id}", response_model=LearningCard)
def learning_cards_get(card_id: str) -> LearningCard:
    card = get_card(card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Learning card not found.")
    return card


@app.post("/learning-cards", response_model=LearningCard, status_code=201)
def learning_cards_create(input_data: LearningCardCreate) -> LearningCard:
    return create_card(input_data)


@app.put("/learning-cards/{card_id}", response_model=LearningCard)
def learning_cards_update(card_id: str, input_data: LearningCardCreate) -> LearningCard:
    card = update_card(card_id, input_data)
    if card is None:
        raise HTTPException(status_code=404, detail="Learning card not found.")
    return card


@app.delete("/learning-cards/{card_id}", status_code=204)
def learning_cards_delete(card_id: str) -> None:
    deleted = delete_card(card_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Learning card not found.")


@app.post("/learning-cards/generate", response_model=LearningCardGenerateResponse)
def learning_cards_generate(input_data: LearningCardGenerateRequest) -> LearningCardGenerateResponse:
    try:
        return generate_learning_card(input_data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/chat/respond", response_model=ChatRespondResponse)
def chat_respond(input_data: ChatRespondRequest) -> ChatRespondResponse:
    try:
        return respond_in_chat(input_data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
