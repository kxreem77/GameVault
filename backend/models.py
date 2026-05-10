from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from database import engine

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True) 
    role = Column(String, default="user") 
    auth_provider = Column(String, default="local") 
    two_factor_secret = Column(String, nullable=True) 

    # Relationships
    games = relationship("Game", back_populates="owner")
    reviews = relationship("Review", back_populates="author")

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    genre = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    owner = relationship("User", back_populates="games")
    reviews = relationship("Review", back_populates="game")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer, nullable=False) # e.g., 1 out of 5
    text = Column(String, nullable=False)
    
    # Foreign Keys linking to the Game and the User
    game_id = Column(Integer, ForeignKey("games.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    game = relationship("Game", back_populates="reviews")
    author = relationship("User", back_populates="reviews")

# Automatically generate the new Review table in PostgreSQL
Base.metadata.create_all(bind=engine)