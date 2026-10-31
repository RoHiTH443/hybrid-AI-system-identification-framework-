import os
import secrets
import hashlib
import smtplib
import ssl
from email.message import EmailMessage
import logging

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    """Generate cryptographically secure 6-digit string"""
    return "".join(str(secrets.randbelow(10)) for _ in range(6))


def hash_otp(otp: str) -> str:
    """SHA-256 hash with pepper"""
    pepper = os.getenv("OTP_PEPPER", "default-pepper-change-me")
    return hashlib.sha256(f"{otp}{pepper}".encode("utf-8")).hexdigest()


def verify_otp_hash(otp: str, stored_hash: str) -> bool:
    return hash_otp(otp) == stored_hash


def hash_password(password: str) -> str:
    """Salted PBKDF2 password hash"""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}:{pw_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored salt:hash"""
    if not stored_hash or ":" not in stored_hash:
        return False
    salt, original_hash = stored_hash.split(":", 1)
    test_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return secrets.compare_digest(test_hash, original_hash)


def generate_session_token() -> str:
    """64-char hex"""
    return secrets.token_hex(32)


def send_otp_email(email: str, otp: str, masked_email: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    if not smtp_host:
        return False

    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    email_from = os.getenv("EMAIL_FROM", smtp_user)

    if not all([smtp_user, smtp_pass, email_from]):
        return False

    msg = EmailMessage()
    msg['Subject'] = 'Hybrid AI SysID - Your Verification Code'
    msg['From'] = email_from
    msg['To'] = email

    html_content = f"""
    <html>
      <body style="font-family: sans-serif; background: #020818; color: #f1f5f9; padding: 24px;">
        <h2 style="color: #38bdf8;">Hybrid AI System Identification</h2>
        <p>Your one-time 6-digit verification code is:</p>
        <h1 style="font-size: 36px; letter-spacing: 6px; color: #10b981; font-family: monospace;">{otp}</h1>
        <p style="color: #94a3b8; font-size: 12px;">This code will expire in {os.getenv('OTP_EXPIRY_MINUTES', '5')} minutes.</p>
      </body>
    </html>
    """
    msg.set_content(f"Your verification code is: {otp}")
    msg.add_alternative(html_content, subtype='html')

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.warning(f"Failed to send OTP email: {e}")
        return False


def mask_email(email: str) -> str:
    try:
        user, domain = email.split('@')
        masked_user = user[0] + "*" * (len(user) - 1) if len(user) > 1 else user
        return f"{masked_user}@{domain}"
    except ValueError:
        return email
