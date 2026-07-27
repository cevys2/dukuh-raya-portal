from pydantic import BaseModel, Field


class AppOut(BaseModel):
    id: int
    key: str
    name: str
    description: str
    icon: str
    base_url: str
    is_active: bool
    sort_order: int


class AppCreate(BaseModel):
    key: str = Field(min_length=1, max_length=50, pattern=r"^[a-z0-9\-]+$")
    name: str = Field(min_length=1, max_length=100)
    description: str = ""
    icon: str = "LayoutGrid"
    base_url: str = Field(min_length=1)
    sort_order: int = 0


class AccessGrant(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    app_id: int
    role: str = Field(default="user", pattern="^(user|admin)$")
