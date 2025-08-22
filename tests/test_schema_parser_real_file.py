import os
import pytest
from pathlib import Path
from app.services.schema_parser import extract_metadata

# Путь к реальному файлу-фикстуре
FIX = Path("tests/fixtures/DesignAssignment-01-00.xsd")

@pytest.mark.skipif(not FIX.exists(), reason="Нет реального файла XSD для интеграционного теста")
def test_extract_metadata_real_design_assignment():
    content = FIX.read_bytes()
    info = extract_metadata(content, filename=FIX.name)
    # Проверяем реальные ожидания
    assert info.get("version") == "01.00"
    assert info.get("name")  # имя корневого элемента должно быть
    # description и namespace могут отсутствовать — не проверяем жёстко
