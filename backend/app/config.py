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


@lru_cache
def get_settings() -> Settings:
    return Settings()

