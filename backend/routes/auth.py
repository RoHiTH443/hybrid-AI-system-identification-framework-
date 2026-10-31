from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session as DBSession
from datetime import datetime, timedelta
import time
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

from database import get_db, OTPRecord, User, Session
from core.auth import (
    generate_otp, hash_otp, verify_otp_hash, generate_session_token,
    send_otp_email, mask_email, hash_password, verify_password
)
from core.session_middleware import get_current_user

router = APIRouter()

# Rate limiting in-memory store
ip_request_timestamps = {}
ip_verify_timestamps = {}


def check_rate_limit(ip: str, store: dict, max_requests: int, window_seconds: int = 300):
    now = time.time()
    if ip not in store:
        store[ip] = []
    store[ip] = [ts for ts in store[ip] if now - ts < window_seconds]
    if len(store[ip]) >= max_requests:
        return False
    store[ip].append(now)
    return True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


class DirectRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


@router.post("/login")
def login(req: LoginRequest, db: DBSession = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Auto-provision new researcher account on first login
        pw_hash = hash_password(req.password)
        name = email.split("@")[0].replace(".", " ").title()
        user = User(
            email=email,
            name=name,
            password_hash=pw_hash,
            role="Research Fellow"
        )
        db.add(user)
        db.flush()
    elif not user.password_hash:
        # Upgrade OTP-created account with password
        user.password_hash = hash_password(req.password)
        db.flush()
    elif not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password. Please check your credentials.")

    duration_days = 30 if req.remember_me else 7
    token = generate_session_token()
    expires = datetime.utcnow() + timedelta(days=duration_days)
    session = Session(user_id=user.id, token=token, expires_at=expires)
    db.add(session)
    db.commit()

    return {
        "success": True,
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name or "Researcher", "role": user.role},
        "expires_at": expires.isoformat(),
    }


@router.post("/register")
def register(req: DirectRegisterRequest, db: DBSession = Depends(get_db)):
    email = req.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    pw_hash = hash_password(req.password)
    user = User(email=email, name=req.name.strip(), password_hash=pw_hash, role="Researcher")
    db.add(user)
    db.flush()

    token = generate_session_token()
    expires = datetime.utcnow() + timedelta(days=14)
    session = Session(user_id=user.id, token=token, expires_at=expires)
    db.add(session)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        "expires_at": expires.isoformat(),
    }


@router.post("/demo")
def enter_demo_mode(db: DBSession = Depends(get_db)):
    """One-click instant login into demo environment without external credentials."""
    demo_email = "demo.researcher@antigravity.ai"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            name="Principal Investigator (Demo)",
            password_hash=hash_password("DemoPassword123!"),
            role="Research Lead"
        )
        db.add(user)
        db.flush()

    token = generate_session_token()
    expires = datetime.utcnow() + timedelta(days=7)
    session = Session(user_id=user.id, token=token, expires_at=expires)
    db.add(session)
    db.commit()

    return {
        "success": True,
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        "expires_at": expires.isoformat(),
        "is_demo": True,
    }


@router.post("/request-otp")
def request_otp(req: OTPRequest, request: Request, db: DBSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip, ip_request_timestamps, 6):
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please wait a moment.")

    email = req.email.lower().strip()

    # Generate OTP
    otp = generate_otp()
    hashed = hash_otp(otp)

    # Invalidate previous unused OTPs
    db.query(OTPRecord).filter(OTPRecord.email == email, OTPRecord.is_used == False).delete()

    expiry_mins = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    record = OTPRecord(
        email=email,
        otp_hash=hashed,
        expires_at=datetime.utcnow() + timedelta(minutes=expiry_mins)
    )
    db.add(record)
    db.commit()

    masked = mask_email(email)
    dev_mode = os.getenv("DEV_MODE", "true").lower() in ("true", "1", "yes")

    sent = False
    if os.getenv("SMTP_HOST"):
        sent = send_otp_email(email, otp, masked)

    # If no SMTP configured, return dev_otp for developer accessibility
    res = {
        "success": True,
        "masked_email": masked,
        "message": "Verification code generated",
        "expires_in": expiry_mins * 60,
    }
    if not sent or dev_mode:
        res["dev_otp"] = otp
        res["note"] = f"Development mode active: verification code is {otp}"

    return res


@router.post("/verify-otp")
def verify_otp(req: OTPVerify, request: Request, db: DBSession = Depends(get_db)):
    email = req.email.lower().strip()
    record = db.query(OTPRecord).filter(
        OTPRecord.email == email,
        OTPRecord.is_used == False,
        OTPRecord.expires_at > datetime.utcnow()
    ).order_by(OTPRecord.created_at.desc()).first()

    if not record:
        return {"success": False, "message": "Invalid or expired code"}

    record.attempts += 1
    if record.attempts > 5:
        record.is_used = True
        db.commit()
        return {"success": False, "message": "Too many attempts. Please request a new code."}

    if not verify_otp_hash(req.otp, record.otp_hash):
        db.commit()
        return {"success": False, "message": "Incorrect verification code", "attempts_remaining": 5 - record.attempts}

    record.is_used = True

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=email.split("@")[0].capitalize(), role="Researcher")
        db.add(user)
        db.flush()

    token = generate_session_token()
    expires = datetime.utcnow() + timedelta(days=7)
    session = Session(user_id=user.id, token=token, expires_at=expires)
    db.add(session)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        "expires_at": expires.isoformat()
    }


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: DBSession = Depends(get_db)):
    email = req.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Avoid user enumeration in public responses
        return {"success": True, "message": "If an account exists, a reset code was generated."}

    otp = generate_otp()
    hashed = hash_otp(otp)
    db.query(OTPRecord).filter(OTPRecord.email == email, OTPRecord.is_used == False).delete()
    record = OTPRecord(email=email, otp_hash=hashed, expires_at=datetime.utcnow() + timedelta(minutes=10))
    db.add(record)
    db.commit()

    return {"success": True, "message": "Reset verification code generated", "dev_otp": otp}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: DBSession = Depends(get_db)):
    email = req.email.lower().strip()
    record = db.query(OTPRecord).filter(
        OTPRecord.email == email,
        OTPRecord.is_used == False,
        OTPRecord.expires_at > datetime.utcnow()
    ).order_by(OTPRecord.created_at.desc()).first()

    if not record or not verify_otp_hash(req.otp, record.otp_hash):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    record.is_used = True
    user.password_hash = hash_password(req.new_password)
    db.commit()

    return {"success": True, "message": "Password successfully updated. You may now sign in."}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}


@router.put("/profile")
def update_profile(req: ProfileUpdateRequest, user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if req.name:
        user.name = req.name.strip()
    if req.role:
        user.role = req.role.strip()
    db.commit()
    db.refresh(user)
    return {"success": True, "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}}


@router.post("/logout")
def logout(request: Request, db: DBSession = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        db.query(Session).filter(Session.token == token).delete()
        db.commit()
    return {"success": True}
