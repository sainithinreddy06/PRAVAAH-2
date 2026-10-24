from app.db.base import Base


def test_core_tables_are_registered() -> None:
    expected = {
        "users",
        "institutions",
        "applications",
        "policies",
        "evidence",
        "obligations",
        "notifications",
        "audit_events",
    }
    assert expected.issubset(set(Base.metadata.tables))


def test_core_tables_have_primary_keys() -> None:
    for table in Base.metadata.sorted_tables:
        assert len(table.primary_key.columns) >= 1, f"{table.name} should have a primary key"
