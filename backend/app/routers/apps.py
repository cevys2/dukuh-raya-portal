from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text

from app.auth import get_current_user, require_admin
from app.database import engine
from app.schemas.apps import AccessGrant, AppCreate, AppOut

router = APIRouter(prefix="/apps", tags=["apps"])


@router.get("/me", response_model=list[AppOut])
def my_apps(user: Annotated[dict, Depends(get_current_user)]):
    """Apps the logged-in user is allowed to see, for the Portal's card grid.

    Admins see every active app automatically; everyone else only sees
    apps they've been explicitly granted in user_app_access.
    """
    with engine.connect() as conn:
        if user.get("role") == "admin":
            rows = conn.execute(
                text(
                    "SELECT id, key, name, description, icon, base_url, is_active, sort_order "
                    "FROM apps WHERE is_active = TRUE ORDER BY sort_order, name"
                )
            ).fetchall()
        else:
            rows = conn.execute(
                text(
                    """
                    SELECT a.id, a.key, a.name, a.description, a.icon, a.base_url,
                           a.is_active, a.sort_order
                    FROM apps a
                    JOIN user_app_access uaa ON uaa.app_id = a.id
                    WHERE uaa.username = :u AND a.is_active = TRUE
                    ORDER BY a.sort_order, a.name
                    """
                ),
                {"u": user["username"]},
            ).fetchall()
    return [
        AppOut(
            id=r[0], key=r[1], name=r[2], description=r[3], icon=r[4],
            base_url=r[5], is_active=r[6], sort_order=r[7],
        )
        for r in rows
    ]


@router.get("", response_model=list[AppOut])
def list_all_apps(_: Annotated[dict, Depends(require_admin)]):
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, key, name, description, icon, base_url, is_active, sort_order "
                "FROM apps ORDER BY sort_order, name"
            )
        ).fetchall()
    return [
        AppOut(
            id=r[0], key=r[1], name=r[2], description=r[3], icon=r[4],
            base_url=r[5], is_active=r[6], sort_order=r[7],
        )
        for r in rows
    ]


@router.post("", response_model=AppOut)
def create_app(body: AppCreate, _: Annotated[dict, Depends(require_admin)]):
    with engine.begin() as conn:
        exists = conn.execute(text("SELECT 1 FROM apps WHERE key = :k"), {"k": body.key}).fetchone()
        if exists:
            raise HTTPException(status_code=400, detail="App key sudah dipakai")
        conn.execute(
            text(
                "INSERT INTO apps (key, name, description, icon, base_url, sort_order) "
                "VALUES (:key, :name, :description, :icon, :base_url, :sort_order)"
            ),
            body.model_dump(),
        )
        row = conn.execute(
            text(
                "SELECT id, key, name, description, icon, base_url, is_active, sort_order "
                "FROM apps WHERE key = :k"
            ),
            {"k": body.key},
        ).fetchone()
    return AppOut(
        id=row[0], key=row[1], name=row[2], description=row[3], icon=row[4],
        base_url=row[5], is_active=row[6], sort_order=row[7],
    )


@router.post("/access")
def grant_access(body: AccessGrant, _: Annotated[dict, Depends(require_admin)]):
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO user_app_access (username, app_id, role) "
                "VALUES (:username, :app_id, :role) "
                "ON CONFLICT (username, app_id) DO UPDATE SET role = EXCLUDED.role"
            ),
            body.model_dump(),
        )
    return {"ok": True}


@router.delete("/access")
def revoke_access(body: AccessGrant, _: Annotated[dict, Depends(require_admin)]):
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM user_app_access WHERE username = :username AND app_id = :app_id"),
            {"username": body.username, "app_id": body.app_id},
        )
    return {"ok": True}
