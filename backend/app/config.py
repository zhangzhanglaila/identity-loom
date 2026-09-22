from functools import lru_cache
import os


class Settings:
    def __init__(self) -> None:
        self.neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD", "identityweb")
        self.neo4j_database = os.getenv("NEO4J_DATABASE", "neo4j")
        self.api_cors_origins = [
            origin.strip()
            for origin in os.getenv("API_CORS_ORIGINS", "http://localhost:5173").split(",")
            if origin.strip()
        ]
        self.api_host = os.getenv("API_HOST", "0.0.0.0")
        self.api_port = int(os.getenv("API_PORT", "8000"))
        self.private_data_dir = os.getenv("PRIVATE_DATA_DIR", "../data/private")
        # 本地 LLM（隐私红线：默认仅允许本机地址，远程需显式 LLM_ALLOW_REMOTE=true）
        self.llm_base_url = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
        self.llm_model = os.getenv("LLM_MODEL", "qwen2.5:7b")
        self.llm_timeout = float(os.getenv("LLM_TIMEOUT", "60"))
        self.llm_allow_remote = os.getenv("LLM_ALLOW_REMOTE", "").lower() in ("1", "true", "yes")


@lru_cache
def get_settings() -> Settings:
    return Settings()

