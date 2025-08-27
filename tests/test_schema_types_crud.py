from app.models_sqlalchemy import SchemaType, Schema

def test_schema_types_crud(client, db_session):
    # используем уникальный code, чтобы не пересекаться с базовыми
    r = client.post("/schema-types/new", data={
        "code": "custom_type_ui",
        "title": "Произвольный тип",
        "description": "desc",
        "filename_pattern": r"(?i)CustomDoc-[0-9]{2}-[0-9]{2}\.xsd",
    }, follow_redirects=False)
    assert r.status_code == 303

    st = db_session.query(SchemaType).filter_by(code="custom_type_ui").first()
    assert st is not None

    # update
    r = client.post(f"/schema-types/{st.id}/save", data={
        "code": "custom_type_ui",
        "title": "Произвольный тип (обновл.)",
        "description": "desc2",
        "filename_pattern": r"(?i)CustomDoc-[0-9]{2}-[0-9]{2}\.xsd",
    }, follow_redirects=False)
    assert r.status_code == 303

    st2 = db_session.get(SchemaType, st.id)
    assert st2.title == "Произвольный тип (обновл.)"

def test_upload_schema_sets_type_id(seed_schema_types, client, db_session, monkeypatch):
    # базовые типы уже есть в транзакции благодаря seed_schema_types
    from app.models_sqlalchemy import SchemaType
    st = db_session.query(SchemaType).filter_by(code="design_assignment").first()
    assert st is not None

    # мок MinIO
    monkeypatch.setattr("app.api.routes.schemas.save_file_minio", lambda p, f, c: f"schemas/fake_{f}")

    xsd = b'''<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                <xs:element name="DesignAssignment" type="xs:string"/>
                <xs:attribute name="SchemaVersion" type="xs:string" use="required" fixed="01.03"/>
              </xs:schema>'''
    files = {"file": ("DesignAssignment-01-03.xsd", xsd, "application/xml")}
    r = client.post("/schemas/upload", files=files, follow_redirects=False)
    assert r.status_code == 303

    s = db_session.query(Schema).order_by(Schema.id.desc()).first()
    assert s is not None
    assert s.type_id == st.id
    assert s.name == st.title
