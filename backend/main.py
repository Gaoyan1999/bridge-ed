from __future__ import annotations

import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import get_bool_env
from .models import (
    ChatRespondRequest,
    ChatRespondResponse,
    KnowledgeTonightCommandRequest,
    KnowledgeTonightCommandResponse,
    LearningCard,
    LearningCardChildKnowledgeGenerateRequest,
    LearningCardChildKnowledgeHeroResponse,
    LearningCardChildKnowledgeResponse,
    LearningCardCreate,
    LearningCardGenerateRequest,
    LearningCardGenerateResponse,
)
from .curricullm_service import (
    build_child_knowledge_hero,
    generate_child_knowledge,
    generate_learning_card,
    respond_in_chat,
    respond_knowledge_tonight,
    stream_respond_in_chat,
)
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
    return update_card(card_id, input_data)


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


@app.post("/chat/respond/stream")
def chat_respond_stream(input_data: ChatRespondRequest) -> StreamingResponse:
    def event_stream():
        try:
            for chunk in stream_respond_in_chat(input_data):
                if not chunk:
                    continue
                yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@app.post("/learning-cards/child-knowledge/hero", response_model=LearningCardChildKnowledgeHeroResponse)
def child_knowledge_hero(input_data: LearningCardChildKnowledgeGenerateRequest) -> LearningCardChildKnowledgeHeroResponse:
    try:
        return build_child_knowledge_hero(input_data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/learning-cards/child-knowledge", response_model=LearningCardChildKnowledgeResponse)
def child_knowledge(input_data: LearningCardChildKnowledgeGenerateRequest) -> LearningCardChildKnowledgeResponse:
    try:
        return generate_child_knowledge(input_data)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/learning-cards/knowledge-tonight/quiz", response_model=KnowledgeTonightCommandResponse)
def knowledge_tonight_quiz(input_data: KnowledgeTonightCommandRequest) -> KnowledgeTonightCommandResponse:
    try:
        return respond_knowledge_tonight("quiz", input_data.cardTitle)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/learning-cards/knowledge-tonight/practice", response_model=KnowledgeTonightCommandResponse)
def knowledge_tonight_practice(input_data: KnowledgeTonightCommandRequest) -> KnowledgeTonightCommandResponse:
    try:
        return respond_knowledge_tonight("practice", input_data.cardTitle)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/learning-cards/knowledge-tonight/teach-back", response_model=KnowledgeTonightCommandResponse)
def knowledge_tonight_teach_back(input_data: KnowledgeTonightCommandRequest) -> KnowledgeTonightCommandResponse:
    try:
        return respond_knowledge_tonight("teach-back", input_data.cardTitle)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
