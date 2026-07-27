import os
import secrets
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
    (`sub` claim) Portal issues at login.
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
            app_id = conn.execute(
                text(
                    """
                    INSERT INTO apps (key, name, description, icon, base_url, sort_order)
                    VALUES ('shipyard-pricing', 'Docking Repair Pricing', 'Katalog & pricing docking repair', 'Ship', :base_url, 0)
                    RETURNING id
                    """
                ),
                {"base_url": settings.shipyard_app_url},
            ).scalar()
            conn.execute(
                text(
                    "INSERT INTO user_app_access (username, app_id, role) "
                    "VALUES ('admin', :app_id, 'admin') ON CONFLICT DO NOTHING"
                ),
                {"app_id": app_id},
            )
            logger.info(
                "Seeded 'shipyard-pricing' app (base_url=%s) and granted access to 'admin'. "
                "Manage apps and access grants from the Portal's Kelola Akses panel.",
                settings.shipyard_app_url,
            )


def ensure_users_table() -> None:
    """Create the shared `users` table if it doesn't exist yet.

    Portal is now the sole owner of login/user management; other apps
    (shipyard-pricing and upcoming ones) only verify the JWT it issues.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'user'
                )
                """
            )
        )
        count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        if count == 0:
            from app.auth import hash_password

            temp_password = secrets.token_urlsafe(12)
            default_hash = hash_password(temp_password)
            conn.execute(
                text(
                    "INSERT INTO users (username, password_hash, role) VALUES ('admin', :pw, 'admin')"
                ),
                {"pw": default_hash},
            )
            logger.warning(
                "Created initial admin user. Username: admin | Temporary password: %s "
                "-- log in and change this immediately (POST /users/password).",
                temp_password,
            )
