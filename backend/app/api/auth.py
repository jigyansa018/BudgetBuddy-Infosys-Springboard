
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from itsdangerous import (
    URLSafeTimedSerializer,
    BadSignature,
    SignatureExpired,
)

from ..database import get_db
from ..models.user import User

from ..schemas.auth import (
    UserRegister,
    Token,
    UserResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)

from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

from ..config import (
    SECRET_KEY,
    FRONTEND_URL,
    PASSWORD_RESET_EXPIRE_MINUTES,
    ENVIRONMENT,
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# PASSWORD RESET TOKEN SERIALIZER
# =========================================================

password_reset_serializer = URLSafeTimedSerializer(
    SECRET_KEY,
    salt="budgetbuddy-password-reset",
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    email = user_data.email.strip().lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        full_name=user_data.full_name,
        email=email,
        password_hash=hash_password(user_data.password),
        is_active=True,
        role="user",
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=Token,
)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
)
def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = request_data.email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    generic_message = (
        "If an account exists for this email, "
        "a password reset link has been generated."
    )

    if not user or not user.is_active:
        return {
            "message": generic_message,
            "reset_url": None,
        }

    token = password_reset_serializer.dumps(
        {
            "user_id": str(user.id),
            "purpose": "password-reset",
        }
    )

    reset_url = (
        f"{FRONTEND_URL.rstrip('/')}/reset-password"
        f"?token={token}"
    )

    if ENVIRONMENT == "development":
        print("\nBUDGETBUDDY PASSWORD RESET LINK")
        print(reset_url)

        return {
            "message": "Password reset link generated.",
            "reset_url": reset_url,
        }

    # Production: connect an email service to deliver the link.
    return {
        "message": (
            "If an account exists for this email, "
            "a password reset link has been generated."
        ),
        "reset_url": None,
    }


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
)
def reset_password(
    request_data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        payload = password_reset_serializer.loads(
            request_data.token,
            max_age=PASSWORD_RESET_EXPIRE_MINUTES * 60,
        )
    except SignatureExpired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired.",
        )
    except BadSignature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset link.",
        )

    if payload.get("purpose") != "password-reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token.",
        )

    user_id = payload.get("user_id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token.",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token.",
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account.",
        )

    user.password_hash = hash_password(
        request_data.new_password
    )

    db.commit()

    return {
        "message": "Password has been reset successfully."
    }