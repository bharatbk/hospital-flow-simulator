from pydantic import BaseModel
from typing import Dict, Any, Optional

class Node(BaseModel):
    id: str
    type: Optional[str]
    position: Dict[str, float]
    data: Dict[str, Any]

class Edge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
