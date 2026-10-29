from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://alienx:alienx@localhost:5432/alienx"
    jwt_secret_key: str = "development-only-change-me"
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    frontend_origin: str = "http://localhost:3000"
    nlp_semantic_enabled: bool = False
    nlp_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    grading_auto_accept_threshold: float = Field(default=0.75, ge=0, le=1)
    grading_review_threshold: float = Field(default=0.25, ge=0, le=1)
    nlp_spacy_enabled: bool = False
    spacy_model_name: str = "en_core_web_sm"

    @model_validator(mode="after")
    def validate_grading_thresholds(self):
        if self.grading_review_threshold >= self.grading_auto_accept_threshold:
            raise ValueError("GRADING_REVIEW_THRESHOLD must be lower than GRADING_AUTO_ACCEPT_THRESHOLD")
        return self

    model_config = SettingsConfigDict(env_file=("backend/.env", ".env"), extra="ignore")


settings = Settings()
