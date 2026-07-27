from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Same Supabase Postgres instance shipyard-pricing already uses.
    # The apps / user_app_access tables live here for now (no dedicated
    # Portal database yet - see project notes).
    supabase_url: str = ""

    # MUST be the exact same value as shipyard-pricing backend's JWT_SECRET.
    # That's what makes "login once, access everything" work: shipyard-pricing
    # issues the token, Portal just verifies it with the same secret.
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    cors_origins: str = "http://localhost:5174,http://127.0.0.1:5174"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
