from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LearningCardCreate(BaseModel):
    title: str = Field(min_length=1)
    teacherSummary: str = Field(min_length=1)
    parentActions: list[str] = Field(min_length=1)


class LearningCard(LearningCardCreate):
    id: str
    createdAt: str
    updatedAt: str


class LearningCardGenerateRequest(BaseModel):
    classTitle: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    gradeSubject: str = ""
    notes: str = ""
    grade: str = ""
    subject: str = ""


class LearningCardGenerateResponse(BaseModel):
    summaryEn: str
    summaryZh: str
    actions: list[str] = Field(min_length=3, max_length=3)
    source: Literal["curricullm", "demo-fallback"]
    warning: str | None = None


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
    warning: str | None = None
