from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException, status
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
    UserLogin,
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
    tags=["Authentication"]
)


# =========================================================
# PASSWORD RESET TOKEN SERIALIZER
# =========================================================

password_reset_serializer = URLSafeTimedSerializer(
    SECRET_KEY,
    salt="budgetbuddy-password-reset"
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        is_active=True,
        role="user"
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
    response_model=Token
)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.email == form_data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    if not verify_password(
        form_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):

    return current_user


# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse
)
def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):

    email = request_data.email.strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    # -----------------------------------------------------
    # Security:
    # Do not reveal whether an email exists.
    # -----------------------------------------------------

    if not user:
        return {
            "message": (
                "If an account exists for this email, "
                "a password reset link has been generated."
            ),
            "reset_url": None
        }

    if not user.is_active:
        return {
            "message": (
                "If an account exists for this email, "
                "a password reset link has been generated."
            ),
            "reset_url": None
        }

    # -----------------------------------------------------
    # Create signed password reset token
    # -----------------------------------------------------

    token = password_reset_serializer.dumps(
        {
            "user_id": str(user.id),
            "purpose": "password-reset"
        }
    )

    # -----------------------------------------------------
    # Create frontend reset URL
    # -----------------------------------------------------

    reset_url = (
        f"{FRONTEND_URL}/reset-password"
        f"?token={token}"
    )

    # -----------------------------------------------------
    # Development mode
    #
    # For local testing we return the reset URL and
    # also print it in the FastAPI terminal.
    #
    # In production, this should be replaced by an
    # actual email service such as SendGrid.
    # -----------------------------------------------------

    if ENVIRONMENT == "development":

        print("\n")
        print("========================================")
        print("BUDGETBUDDY PASSWORD RESET LINK")
        print("========================================")
        print(reset_url)
        print("========================================")
        print("\n")

        return {
            "message": "Password reset link generated.",
            "reset_url": reset_url
        }

    # -----------------------------------------------------
    # Production response
    # -----------------------------------------------------

    return {
        "message": (
            "If an account exists for this email, "
            "a password reset link has been sent."
        ),
        "reset_url": None
    }


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse
)
def reset_password(
    request_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # Verify token and expiration
    # -----------------------------------------------------

    try:

        payload = password_reset_serializer.loads(
            request_data.token,
            max_age=PASSWORD_RESET_EXPIRE_MINUTES * 60
        )

    except SignatureExpired:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired."
        )

    except BadSignature:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset link."
        )

    # -----------------------------------------------------
    # Verify token purpose
    # -----------------------------------------------------

    if payload.get("purpose") != "password-reset":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token."
        )

    # -----------------------------------------------------
    # Get user ID from token
    # -----------------------------------------------------

    user_id = payload.get("user_id")

    if not user_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token."
        )

    try:

        user_id = int(user_id)

    except (TypeError, ValueError):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token."
        )

    # -----------------------------------------------------
    # Find user
    # -----------------------------------------------------

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # -----------------------------------------------------
    # Check account status
    # -----------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account."
        )

    # -----------------------------------------------------
    # Update password
    # -----------------------------------------------------

    user.password_hash = hash_password(
        request_data.new_password
    )

    db.commit()

    return {
        "message": "Password has been reset successfully."
    }