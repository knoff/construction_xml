from app.models_sqlalchemy import Schema


def test_upload_schema_success(client, db_session, monkeypatch):
    # мок MinIO — чтобы не ходить в сеть
    def fake_save(prefix, filename, content):
        return f"{prefix}/fake_{filename}"
    monkeypatch.setattr("app.api.routes.schemas.save_file_minio", fake_save)

    # мок реестра типов — чтобы имя/описание шли из справочника
    from app.services import schema_classifier
    monkeypatch.setattr(
        schema_classifier,
        "get_registry",
        lambda: [
            schema_classifier.SchemaTypeRule(
                code="design_assignment",
                title="Задание на проектирование",
                description="Описание из справочника",
                filename_pattern=r"(?i)DesignAssignment-[0-9]{2}-[0-9]{2}\.xsd",
            )
        ],
    )

    xsd = b'''<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                <xs:annotation><xs:documentation>Test Schema</xs:documentation></xs:annotation>
                <xs:element name="DesignAssignment" type="xs:string"/>
                <xs:attribute name="SchemaVersion" type="xs:string" use="required" fixed="01.03"/>
              </xs:schema>'''

    files = {"file": ("DesignAssignment-01-03.xsd", xsd, "application/xml")}
    r = client.post("/schemas/upload", files=files, follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["Location"].startswith("/schemas/")

    # проверяем запись в той же сессии (видна внутри транзакции)
    items = db_session.query(Schema).order_by(Schema.id.desc()).all()
    assert len(items) >= 1
    s = items[0]
    # имя и описание — из справочника типов
    assert s.name == "Задание на проектирование"
    assert s.version == "01.03"
    assert "Описание из справочника" in (s.description or "")
    assert s.file_path.startswith("schemas/fake_")
