# spotify_clone/spotify_clone/settings.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(path):
    """Read KEY=VALUE lines from a .env file (next to manage.py) into the environment.

    Real environment variables always win, so nothing here overrides a value you set yourself.
    """
    try:
        lines = Path(path).read_text(encoding="utf-8-sig").splitlines()
    except OSError:
        return

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key.strip(), value)


load_env_file(BASE_DIR / ".env")

SECRET_KEY = "change-me-in-production-please"
DEBUG = True
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "music",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",  # CSRF protection
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "music.middleware.TurboFormErrorsMiddleware",
]

ROOT_URLCONF = "spotify_clone.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "spotify_clone.wsgi.application"

# Database (SQLite file: db.sqlite3)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------- Authentication and session persistence ----------

LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "dashboard"
LOGOUT_REDIRECT_URL = "home"

# Keep the login session for 14 days.
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14

# Keep the session cookie after closing the browser.
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# Refresh the session expiry as the user continues using the app.
SESSION_SAVE_EVERY_REQUEST = True

# ---------- Email (password reset links) ----------
#
# The reset link is sent to the email address the user registered with.
# To send real emails (for example to a Gmail inbox), put these in a ".env" file
# next to manage.py (copy ".env.example"):
#
#   EMAIL_HOST_USER=yourname@gmail.com
#   EMAIL_HOST_PASSWORD=your-16-letter-app-password
#
# For Gmail this must be an "App password" (Google Account > Security > 2-Step
# Verification > App passwords), NOT your normal Gmail password.
#
# Without those two values the app does not send anything: the email is printed in
# the terminal instead, so you can still test locally.
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "").strip()
# Google shows app passwords in groups ("abcd efgh ijkl mnop"); the spaces are not part of it.
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "").replace(" ", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_TIMEOUT = 20  # seconds, so a bad connection can't freeze the page

SMTP_CONFIGURED = bool(EMAIL_HOST_USER and EMAIL_HOST_PASSWORD)

# Real emails whenever the SMTP login is filled in (even while DEBUG is True).
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND") or (
    "django.core.mail.backends.smtp.EmailBackend"
    if SMTP_CONFIGURED
    else "django.core.mail.backends.console.EmailBackend"
)

# Gmail only accepts mail "from" the account that logged in.
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL") or (
    f"Spotify Clone <{EMAIL_HOST_USER}>"
    if EMAIL_HOST_USER
    else "Spotify Clone <no-reply@example.com>"
)
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Optional: the address used inside the reset link, e.g. "192.168.1.5:8000" so the link
# also opens on your phone. Leave empty to use the address you are browsing the site from.
SITE_DOMAIN = os.getenv("SITE_DOMAIN", "").strip()

PASSWORD_RESET_TIMEOUT = 3600