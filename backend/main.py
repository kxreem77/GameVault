from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError
import pyotp
import models, database, auth_utils

app = FastAPI()

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- Database Connection ---
def get_db():
    db = database.engine.connect()
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=database.engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Security Bouncer ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user 

# --- Pydantic Data Schemas ---
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str
    totp_code: Optional[str] = None # NEW: The 6-digit pin

class GameCreate(BaseModel):
    title: str
    genre: str
    platform: str

class ReviewCreate(BaseModel):
    rating: int
    text: str
    game_id: int

# --- Authentication Routes ---
@app.post("/register")
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pwd = auth_utils.hash_password(user_data.password)
    new_user = models.User(email=user_data.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully!", "user_id": new_user.id}

@app.post("/login")
def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not auth_utils.verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # NEW 2FA LOGIC
    if user.two_factor_secret:
        if not user_data.totp_code:
            # Tell the frontend to ask for the pin!
            raise HTTPException(status_code=403, detail="2FA_REQUIRED")
        
        # Verify the pin
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(user_data.totp_code):
            raise HTTPException(status_code=400, detail="Invalid 2FA code")
    
    access_token = auth_utils.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/vip-lounge")
def enter_vip_lounge(current_user: models.User = Depends(get_current_user)):
    return {
        "message": "Welcome to the VIP Lounge!",
        "your_email": current_user.email,
        "your_role": current_user.role,
        "secret_data": "Only logged-in users can see this."
    }

# --- 2FA Setup Route ---
@app.post("/2fa/setup")
def setup_2fa(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.two_factor_secret:
        return {"message": "2FA is already enabled!"}

    # Generate a massive random key
    secret = pyotp.random_base32()
    current_user.two_factor_secret = secret
    db.commit()

    # Format it so Google Authenticator can read it
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name="GameVault")

    return {"secret": secret, "uri": uri}

# --- Game & Review Routes ---
@app.post("/games")
def create_game(game_data: GameCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_game = models.Game(title=game_data.title, genre=game_data.genre, platform=game_data.platform, owner_id=current_user.id)
    db.add(new_game)
    db.commit()
    db.refresh(new_game)
    return new_game

@app.get("/games")
def get_my_games(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Game).filter(models.Game.owner_id == current_user.id).all()

@app.post("/reviews")
def create_review(review_data: ReviewCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_review = models.Review(rating=review_data.rating, text=review_data.text, game_id=review_data.game_id, user_id=current_user.id)
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@app.get("/games/{game_id}/reviews")
def get_game_reviews(game_id: int, db: Session = Depends(get_db)):
    return db.query(models.Review).filter(models.Review.game_id == game_id).all()

@app.delete("/reviews/{review_id}")
def delete_review(review_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(review)
    db.commit()
    return {"message": "Review deleted successfully"}