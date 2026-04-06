from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class TranslatedSummaries(BaseModel):
    model_config = ConfigDict(extra="forbid")

    zh: str = ""
    en: str = ""
    fr: str = ""


class LearningCardCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    schemaVersion: int = 3
    createdAt: str | None = None
    updatedAt: str | None = None

    authorUserId: str = ""
    classId: str | None = None
    classLessonTitle: str = ""
    grade: str = ""
    subject: str = ""
    topic: str = ""
    teacherNotes: str = ""
    parentSummary: str = ""
    translatedSummaries: TranslatedSummaries | None = None
    childKnowledge: dict[str, Any] | None = None
    tonightActions: list[dict[str, Any]] = Field(default_factory=list)
    audience: dict[str, Any] = Field(default_factory=dict)
    sentAt: str | None = None
    threadId: str = ""
    status: dict[str, Any] = Field(default_factory=dict)

    # Legacy fields kept for backward compatibility with early payloads.
    title: str | None = None
    teacherSummary: str | None = None
    parentActions: list[str] | None = None


class LearningCard(LearningCardCreate):
    id: str
    createdAt: str
    updatedAt: str


class LearningCardGenerateRequest(BaseModel):
    classTitle: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    grade: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    notes: str = ""


class LearningCardGenerateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    translated_summaries: TranslatedSummaries = Field(alias="translatedSummaries")
    actions: list[str] = Field(min_length=3, max_length=3)
    source: Literal["curricullm", "demo-fallback"]
    warning: Optional[str] = None


class ChatMessage(BaseModel):
    who: str = Field(min_length=1)
    type: Literal["in", "out"]
    text: str = Field(min_length=1)


class ChatRespondRequest(BaseModel):
    role: Literal["parent", "student", "teacher"]
    threadTitle: str = ""
    threadId: str = Field(min_length=1)
    message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatRespondResponse(BaseModel):
    reply: str
    source: Literal["curricullm", "demo-fallback"]
    warning: Optional[str] = None
