from pydantic import BaseModel, Field
from typing import Optional, List

class Developer(BaseModel):
    name: Optional[str] = None
    inn: Optional[str] = None

class ObjectInfo(BaseModel):
    areaTotal: Optional[float] = None
    volumeTotal: Optional[float] = None
    volumeAbove0: Optional[float] = None
    volumeBelow0: Optional[float] = None
    storeys: Optional[int] = None
    parts: Optional[List[str]] = None  # составные части

class Project(BaseModel):
    id: str
    name: Optional[str] = None
    developer: Optional[Developer] = None
    object: Optional[ObjectInfo] = None

class Assignment(BaseModel):
    author: Optional[Developer] = None

class ExplanatoryNote(BaseModel):
    notes: Optional[str] = None
    objectParts: Optional[List[str]] = None

class Document(BaseModel):
    id: str = Field(..., description="Document ID")
    project: Project
    assignment: Optional[Assignment] = None
    explanatory: Optional[ExplanatoryNote] = None
    # future: links to files, schema versions, provenance, etc.