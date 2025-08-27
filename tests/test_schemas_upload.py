from app.models_sqlalchemy import Schema, SchemaType

def test_upload_schema_success(seed_schema_types, client, db_session, monkeypatch):
    # есть тип в БД (из сидера)
    st = db_session.query(SchemaType).filter_by(code="design_assignment").first()
    assert st is not None

    # мок MinIO — чтобы не ходить в сеть
    def fake_save(prefix, filename, content):
        return f"{prefix}/fake_{filename}"
    monkeypatch.setattr("app.api.routes.schemas.save_file_minio", fake_save)

    xsd = b'''<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                <xs:annotation><xs:documentation>Test Schema</xs:documentation></xs:annotation>
                <xs:element name="DesignAssignment" type="xs:string"/>
                <xs:attribute name="SchemaVersion" type="xs:string" use="required" fixed="01.03"/>
              </xs:schema>'''

    files = {"file": ("DesignAssignment-01-03.xsd", xsd, "application/xml")}
    r = client.post("/schemas/upload", files=files, follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["Location"].startswith("/schemas/")

    # проверяем запись (видна в транзакции)
    s = db_session.query(Schema).order_by(Schema.id.desc()).first()
    assert s is not None
    assert s.name == st.title                 # из БД
    assert s.version == "01.03"
    assert "Test Schema" in (s.description or "") or (s.description == st.description)
    assert s.file_path.startswith("schemas/fake_")
