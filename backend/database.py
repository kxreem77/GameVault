import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# This checks if we are on the live server (which will have a DATABASE_URL).
# If not, it falls back to a local SQLite database for testing.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gamevault.db")

# Quick fix: SQLAlchemy requires the prefix to be 'postgresql://' instead of 'postgres://'
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs a specific argument, PostgreSQL does not.
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()