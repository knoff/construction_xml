from app.models_sqlalchemy import Schema

def test_delete_schema(client, db_session, monkeypatch):
    # Заготовим запись напрямую в БД
    s = Schema(
        name="DesignAssignment",
        version="01.03",
        namespace=None,
        description="Для удаления",
        file_path="schemas/fake_DesignAssignment-01-03.xsd",
        created_at=__import__("datetime").datetime.utcnow(),
    )
    db_session.add(s)
    db_session.flush()  # получим id, не коммитим (мы в транзакции теста)

    # мок удаления файла из MinIO
    monkeypatch.setattr("app.api.routes.schemas.delete_file_minio", lambda key: None)

    r = client.post(f"/schemas/{s.id}/delete", follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["Location"].startswith("/schemas")

    # запись удалена в рамках той же транзакции
    found = db_session.get(Schema, s.id)
    assert found is None
