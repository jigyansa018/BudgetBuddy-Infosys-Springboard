import os
import secrets
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from sqlalchemy.orm import Session

from .database import get_db
from .models.user import User
from .auth import create_access_token, hash_password


load_dotenv()


router = APIRouter(
    prefix="/auth",
    tags=["OAuth Authentication"]
)


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "const API_URL = import.meta.env.VITE_API_URL;"
)

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is missing from the environment variables."
    )
    

# ============================================================
# OAUTH REDIRECT URIs
# ============================================================

GOOGLE_REDIRECT_URI = (
    f"{BACKEND_URL}/auth/google/callback"
)

GITHUB_REDIRECT_URI = (
    f"{BACKEND_URL}/auth/github/callback"
)


# ============================================================
# OAUTH STATE
# ============================================================

state_serializer = URLSafeTimedSerializer(
    SECRET_KEY,
    salt="budgetbuddy-oauth-state"
)


def create_oauth_state() -> str:
    random_value = secrets.token_urlsafe(32)

    return state_serializer.dumps({
        "state": random_value
    })


def verify_oauth_state(
    request: Request,
    state: str
) -> bool:

    cookie_state = request.cookies.get("oauth_state")

    if not cookie_state:
        return False

    if not secrets.compare_digest(
        cookie_state,
        state
    ):
        return False

    try:
        state_serializer.loads(
            state,
            max_age=600
        )

        return True

    except (BadSignature, SignatureExpired):
        return False


def clear_oauth_cookie(
    response: RedirectResponse
):
    response.delete_cookie(
        key="oauth_state"
    )


# ============================================================
# FRONTEND REDIRECT HELPERS
# ============================================================

def redirect_to_frontend_with_token(
    token: str
) -> RedirectResponse:
    """
    Redirect the browser to the React OAuth callback with the
    BudgetBuddy JWT.

    Query-string token is used here because the React callback
    is currently receiving the callback URL without the hash
    fragment. The frontend callback reads the query parameter.
    """

    params = urlencode({
        "token": token
    })

    callback_url = (
        f"{FRONTEND_URL.rstrip('/')}/oauth/callback"
        f"?{params}"
    )

    # Never print the JWT itself to the terminal.
    print(
        "OAuth redirect URL:",
        f"{FRONTEND_URL.rstrip('/')}/oauth/callback?token=REDACTED"
    )

    response = RedirectResponse(
        url=callback_url,
        status_code=302
    )

    response.headers["Cache-Control"] = "no-store"

    return response


def redirect_to_frontend_error(
    message: str
) -> RedirectResponse:

    params = urlencode({
        "error": message
    })

    return RedirectResponse(
        url=f"{FRONTEND_URL}/login?{params}",
        status_code=302
    )


# ============================================================
# USER CREATION / LOGIN
# ============================================================

def create_social_user(
    db: Session,
    email: str,
    full_name: str
) -> User:

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        return existing_user

    # Create a valid bcrypt hash for the required password_hash field.
    # The random password is not exposed to the user.
    random_password = secrets.token_urlsafe(32)
    password_hash = hash_password(random_password)

    user = User(
        full_name=full_name or "BudgetBuddy User",
        email=email,
        password_hash=password_hash,
        is_active=True,
        role="user"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def get_or_create_oauth_user(
    db: Session,
    email: str,
    full_name: str
) -> User:

    email = email.strip().lower()

    if not email:
        raise HTTPException(
            status_code=400,
            detail="OAuth provider did not return an email address."
        )

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if user:

        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="Your BudgetBuddy account is inactive."
            )

        return user

    return create_social_user(
        db=db,
        email=email,
        full_name=full_name
    )


def generate_jwt_for_user(
    user: User
) -> str:

    return create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role
        }
    )


# ============================================================
# GOOGLE OAUTH
# ============================================================

@router.get("/google/login")
async def google_login():

    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID is not configured."
        )

    state = create_oauth_state()

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account"
    }

    authorization_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urlencode(params)
    )

    response = RedirectResponse(
        url=authorization_url,
        status_code=302
    )

    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=600
    )

    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db)
):

    if error:
        return redirect_to_frontend_error(
            f"Google authentication failed: {error}"
        )

    if not code or not state:
        return redirect_to_frontend_error(
            "Google authentication was incomplete."
        )

    if not verify_oauth_state(request, state):
        return redirect_to_frontend_error(
            "Invalid or expired OAuth state."
        )

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return redirect_to_frontend_error(
            "Google OAuth is not configured."
        )

    try:

        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            # Exchange authorization code for Google token
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_REDIRECT_URI
                }
            )

            if token_response.status_code != 200:
                return redirect_to_frontend_error(
                    "Unable to exchange Google authorization code."
                )

            token_data = token_response.json()

            google_access_token = token_data.get(
                "access_token"
            )

            if not google_access_token:
                return redirect_to_frontend_error(
                    "Google did not return an access token."
                )

            # Get Google profile
            user_response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={
                    "Authorization":
                        f"Bearer {google_access_token}"
                }
            )

            if user_response.status_code != 200:
                return redirect_to_frontend_error(
                    "Unable to retrieve Google profile."
                )

            google_user = user_response.json()

        email = google_user.get("email")

        email_verified = google_user.get(
            "email_verified",
            False
        )

        if not email:
            return redirect_to_frontend_error(
                "Google account does not have an email address."
            )

        if not email_verified:
            return redirect_to_frontend_error(
                "Google email address is not verified."
            )

        full_name = (
            google_user.get("name")
            or google_user.get("given_name")
            or "BudgetBuddy User"
        )

        user = get_or_create_oauth_user(
            db=db,
            email=email,
            full_name=full_name
        )

        jwt_token = generate_jwt_for_user(user)

        response = redirect_to_frontend_with_token(
            jwt_token
        )

        clear_oauth_cookie(response)

        return response

    except httpx.RequestError:
        return redirect_to_frontend_error(
            "Unable to connect to Google."
        )

    except HTTPException as exc:
        return redirect_to_frontend_error(
            exc.detail
        )

    except Exception as exc:
        print("Google OAuth error:", exc)

        return redirect_to_frontend_error(
            "Google authentication failed."
        )


# ============================================================
# GITHUB OAUTH
# ============================================================

@router.get("/github/login")
async def github_login():

    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GITHUB_CLIENT_ID is not configured."
        )

    state = create_oauth_state()

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
        "state": state
    }

    authorization_url = (
        "https://github.com/login/oauth/authorize?"
        + urlencode(params)
    )

    response = RedirectResponse(
        url=authorization_url,
        status_code=302
    )

    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=600
    )

    return response


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db)
):

    if error:
        return redirect_to_frontend_error(
            f"GitHub authentication failed: {error}"
        )

    if not code or not state:
        return redirect_to_frontend_error(
            "GitHub authentication was incomplete."
        )

    if not verify_oauth_state(request, state):
        return redirect_to_frontend_error(
            "Invalid or expired OAuth state."
        )

    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        return redirect_to_frontend_error(
            "GitHub OAuth is not configured."
        )

    try:

        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            # Exchange code for GitHub access token
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GITHUB_REDIRECT_URI
                },
                headers={
                    "Accept": "application/json"
                }
            )

            if token_response.status_code != 200:
                return redirect_to_frontend_error(
                    "Unable to exchange GitHub authorization code."
                )

            token_data = token_response.json()

            github_access_token = token_data.get(
                "access_token"
            )

            if not github_access_token:
                return redirect_to_frontend_error(
                    "GitHub did not return an access token."
                )

            github_headers = {
                "Authorization":
                    f"Bearer {github_access_token}",
                "Accept":
                    "application/vnd.github+json",
                "X-GitHub-Api-Version":
                    "2022-11-28",
                "User-Agent":
                    "BudgetBuddy"
            }

            # Get GitHub profile
            profile_response = await client.get(
                "https://api.github.com/user",
                headers=github_headers
            )

            if profile_response.status_code != 200:
                return redirect_to_frontend_error(
                    "Unable to retrieve GitHub profile."
                )

            github_user = profile_response.json()

            email = github_user.get("email")

            # GitHub may hide email from /user
            if not email:

                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers=github_headers
                )

                if email_response.status_code == 200:

                    emails = email_response.json()

                    primary_email = next(
                        (
                            item.get("email")
                            for item in emails
                            if item.get("primary") is True
                            and item.get("verified") is True
                        ),
                        None
                    )

                    verified_email = next(
                        (
                            item.get("email")
                            for item in emails
                            if item.get("verified") is True
                        ),
                        None
                    )

                    email = (
                        primary_email
                        or verified_email
                    )

            if not email:
                return redirect_to_frontend_error(
                    "No verified email was found on your GitHub account."
                )

            full_name = (
                github_user.get("name")
                or github_user.get("login")
                or "BudgetBuddy User"
            )

        user = get_or_create_oauth_user(
            db=db,
            email=email,
            full_name=full_name
        )

        jwt_token = generate_jwt_for_user(user)

        response = redirect_to_frontend_with_token(
            jwt_token
        )

        clear_oauth_cookie(response)

        return response

    except httpx.RequestError:
        return redirect_to_frontend_error(
            "Unable to connect to GitHub."
        )

    except HTTPException as exc:
        return redirect_to_frontend_error(
            exc.detail
        )

    except Exception as exc:
        print("GitHub OAuth error:", exc)

        return redirect_to_frontend_error(
            "GitHub authentication failed."
        )