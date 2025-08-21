from pathlib import Path
from typing import Dict, Any, List
import yaml, json
from pydantic import BaseModel, ValidationError

RULES_DIR = Path("app/rules")
RULES_DIR.mkdir(parents=True, exist_ok=True)

class Rule(BaseModel):
    id: str
    when: str | None = None
    generate: List[Dict[str, Any]] | None = None
    validate: List[Dict[str, Any]] | None = None
    severity: str | None = None
    version: str | None = None

def save_rule_yaml(content: str) -> Dict[str, Any]:
    data = yaml.safe_load(content)
    # Accept list or single rule
    if isinstance(data, list):
        rules = [Rule(**r) for r in data]
        filename = f"rules_{rules[0].id}.yaml"
    else:
        rule = Rule(**data)
        rules = [rule]
        filename = f"rule_{rule.id}.yaml"
    path = RULES_DIR / filename
    path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return {"saved": True, "file": str(path), "count": len(rules)}