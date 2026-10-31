from fastapi import Request, HTTPException, Depends
from sqlalchemy.orm import Session as DBSession
from datetime import datetime
from database import get_db, Session as SessionModel, User

def get_current_user(request: Request, db: DBSession = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    token = auth_header.split(" ")[1]
    
    session = db.query(SessionModel).filter(
        SessionModel.token == token,
        SessionModel.expires_at > datetime.utcnow()
    ).first()
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not active")
        
    return user
