from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Same Railway Postgres instance shipyard-pricing already uses.
    # The apps / user_app_access tables live here for now (no dedicated
    # Portal database yet - see project notes).
    database_url: str = ""

    # Portal is the sole issuer of login tokens now. Every other app
    # (shipyard-pricing, upcoming apps) MUST use this exact same value
    # to verify tokens signed here - that's what makes "login once,
    # access everything" work.
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    cors_origins: str = "http://localhost:5174,http://127.0.0.1:5174"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
