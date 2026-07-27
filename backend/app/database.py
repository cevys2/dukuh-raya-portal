import os
import logging

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.config import settings

logger = logging.getLogger("app.database")


def normalize_db_url(db_url: str) -> str:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)
    elif db_url.startswith("postgresql://") and "pg8000" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)
    return db_url


def get_engine() -> Engine:
    db_url = os.environ.get("DATABASE_URL") or settings.database_url
    if not db_url:
        raise RuntimeError("DATABASE_URL is not set")
    return create_engine(
        normalize_db_url(db_url),
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300,
    )


engine = get_engine()


def ensure_portal_tables() -> None:
    """Create the apps + user_app_access tables if they don't exist yet.

    NOTE: these currently live in shipyard-pricing's Railway Postgres database
    (no dedicated Portal database yet). `users.username` is treated as
    the shared identity - both tables reference it directly rather than
    a numeric user_id, since that's exactly what's inside the JWT
    (`sub` claim) that shipyard-pricing issues at login.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS apps (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    icon VARCHAR(50) NOT NULL DEFAULT 'LayoutGrid',
                    base_url TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    sort_order INTEGER NOT NULL DEFAULT 0
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_app_access (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) NOT NULL,
                    app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL DEFAULT 'user',
                    UNIQUE (username, app_id)
                )
                """
            )
        )
        count = conn.execute(text("SELECT COUNT(*) FROM apps")).scalar()
        if count == 0:
            logger.info(
                "No apps registered yet. Insert rows into `apps` (and grant "
                "access via `user_app_access`) to make them show up in the Portal."
            )
