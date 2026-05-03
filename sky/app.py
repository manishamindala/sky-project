"""
Qatar Foundation Admin Portal — Flask Backend
Uses only stdlib sqlite3 so no extra pip packages are needed beyond Flask + Werkzeug.
"""

import os
import re
import uuid
import secrets
import sqlite3
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, session, send_from_directory, g
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder=".", static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "qatar-foundation-secret-change-in-prod")
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

DATABASE = os.environ.get("DATABASE_PATH", "qatar_foundation.db")

ALLOWED_ORIGINS = {
    "http://localhost:5500", "http://127.0.0.1:5500",
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:5000", "null",
}

@app.after_request
def add_cors(response):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"]      = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"]     = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"]     = "Content-Type"
    return response

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return add_cors(jsonify({}))

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS admins (
            id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS opportunities (
            id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
            name TEXT NOT NULL, duration TEXT NOT NULL, start_date TEXT NOT NULL,
            description TEXT NOT NULL, skills TEXT NOT NULL, category TEXT NOT NULL,
            future_opportunities TEXT NOT NULL, max_applicants INTEGER,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT UNIQUE NOT NULL,
            admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
            expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
        );
    """)
    db.commit()
    db.close()

init_db()

def now_iso():
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

def is_valid_email(email):
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "admin_id" not in session:
            return jsonify({"error": "Unauthorized. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated

VALID_CATEGORIES = {"Technology", "Business", "Design", "Marketing", "Data Science", "Other"}
REQUIRED_OPP_FIELDS = ["name", "duration", "start_date", "description", "skills",
                        "category", "future_opportunities"]

def validate_opportunity(data):
    for field in REQUIRED_OPP_FIELDS:
        val = data.get(field)
        if not val or (isinstance(val, str) and not val.strip()):
            return f"{field.replace('_',' ').capitalize()} is required."
    if data.get("category") not in VALID_CATEGORIES:
        return f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}."
    return None

def row_to_dict(row):
    return dict(row) if row else None

# ─── Auth ────────────────────────────────────────────────────────────────────

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    d = request.get_json() or {}
    full_name = (d.get("full_name") or "").strip()
    email     = (d.get("email") or "").strip().lower()
    password  = d.get("password") or ""
    confirm   = d.get("confirm_password") or ""
    if not all([full_name, email, password, confirm]):
        return jsonify({"error": "All fields are required."}), 400
    if not is_valid_email(email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if password != confirm:
        return jsonify({"error": "Passwords do not match."}), 400
    db = get_db()
    if db.execute("SELECT 1 FROM admins WHERE email=?", (email,)).fetchone():
        return jsonify({"error": "An account with this email already exists."}), 409
    db.execute("INSERT INTO admins VALUES (?,?,?,?,?)",
               (str(uuid.uuid4()), full_name, email, generate_password_hash(password), now_iso()))
    db.commit()
    return jsonify({"message": "Account created successfully. Please log in."}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    d           = request.get_json() or {}
    email       = (d.get("email") or "").strip().lower()
    password    = d.get("password") or ""
    remember_me = bool(d.get("remember_me", False))
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400
    db    = get_db()
    admin = row_to_dict(db.execute("SELECT * FROM admins WHERE email=?", (email,)).fetchone())
    if not admin or not check_password_hash(admin["password_hash"], password):
        return jsonify({"error": "Invalid email or password."}), 401
    session.permanent   = remember_me
    session["admin_id"] = admin["id"]
    return jsonify({"message": "Login successful.",
                    "admin": {"id": admin["id"], "full_name": admin["full_name"], "email": admin["email"]}}), 200

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."}), 200

@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    db    = get_db()
    admin = row_to_dict(db.execute("SELECT * FROM admins WHERE id=?", (session["admin_id"],)).fetchone())
    if not admin:
        session.clear()
        return jsonify({"error": "Session invalid."}), 401
    return jsonify({"admin": {"id": admin["id"], "full_name": admin["full_name"], "email": admin["email"]}}), 200

@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    d     = request.get_json() or {}
    email = (d.get("email") or "").strip().lower()
    if not email or not is_valid_email(email):
        return jsonify({"error": "Please enter a valid email address."}), 400
    db    = get_db()
    admin = row_to_dict(db.execute("SELECT * FROM admins WHERE email=?", (email,)).fetchone())
    if admin:
        db.execute("UPDATE password_reset_tokens SET used=1 WHERE admin_id=? AND used=0", (admin["id"],))
        token = secrets.token_urlsafe(32)
        exp   = (datetime.utcnow() + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
        db.execute("INSERT INTO password_reset_tokens (token,admin_id,expires_at,created_at) VALUES (?,?,?,?)",
                   (token, admin["id"], exp, now_iso()))
        db.commit()
        print(f"\n[PASSWORD RESET] http://localhost:5000/reset-password?token={token}\n")
    return jsonify({"message": "If an account with that email exists, a password reset link has been sent."}), 200

@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    d        = request.get_json() or {}
    token    = d.get("token") or ""
    password = d.get("password") or ""
    confirm  = d.get("confirm_password") or ""
    if not token:
        return jsonify({"error": "Reset token is required."}), 400
    db  = get_db()
    row = row_to_dict(db.execute("SELECT * FROM password_reset_tokens WHERE token=? AND used=0", (token,)).fetchone())
    if not row:
        return jsonify({"error": "This reset link is invalid or has already been used."}), 400
    if datetime.utcnow() > datetime.strptime(row["expires_at"], "%Y-%m-%dT%H:%M:%S"):
        return jsonify({"error": "This reset link has expired. Please request a new one."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if password != confirm:
        return jsonify({"error": "Passwords do not match."}), 400
    db.execute("UPDATE admins SET password_hash=? WHERE id=?", (generate_password_hash(password), row["admin_id"]))
    db.execute("UPDATE password_reset_tokens SET used=1 WHERE token=?", (token,))
    db.commit()
    return jsonify({"message": "Password reset successfully. Please log in with your new password."}), 200

# ─── Opportunities ────────────────────────────────────────────────────────────

def parse_max_ap(val):
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None

@app.route("/api/opportunities", methods=["GET"])
@login_required
def list_opportunities():
    rows = get_db().execute(
        "SELECT * FROM opportunities WHERE admin_id=? ORDER BY created_at DESC", (session["admin_id"],)
    ).fetchall()
    return jsonify({"opportunities": [row_to_dict(r) for r in rows]}), 200

@app.route("/api/opportunities", methods=["POST"])
@login_required
def create_opportunity():
    data  = request.get_json() or {}
    error = validate_opportunity(data)
    if error:
        return jsonify({"error": error}), 400
    oid, ts = str(uuid.uuid4()), now_iso()
    get_db().execute(
        "INSERT INTO opportunities VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (oid, session["admin_id"], data["name"].strip(), data["duration"].strip(),
         data["start_date"].strip(), data["description"].strip(), data["skills"].strip(),
         data["category"].strip(), data["future_opportunities"].strip(),
         parse_max_ap(data.get("max_applicants")), ts, ts)
    )
    get_db().commit()
    opp = row_to_dict(get_db().execute("SELECT * FROM opportunities WHERE id=?", (oid,)).fetchone())
    return jsonify({"message": "Opportunity created successfully.", "opportunity": opp}), 201

@app.route("/api/opportunities/<oid>", methods=["GET"])
@login_required
def get_opportunity(oid):
    row = row_to_dict(get_db().execute(
        "SELECT * FROM opportunities WHERE id=? AND admin_id=?", (oid, session["admin_id"])
    ).fetchone())
    if not row:
        return jsonify({"error": "Opportunity not found."}), 404
    return jsonify({"opportunity": row}), 200

@app.route("/api/opportunities/<oid>", methods=["PUT"])
@login_required
def update_opportunity(oid):
    db = get_db()
    if not db.execute("SELECT 1 FROM opportunities WHERE id=? AND admin_id=?",
                      (oid, session["admin_id"])).fetchone():
        return jsonify({"error": "Opportunity not found."}), 404
    data  = request.get_json() or {}
    error = validate_opportunity(data)
    if error:
        return jsonify({"error": error}), 400
    db.execute(
        """UPDATE opportunities SET name=?,duration=?,start_date=?,description=?,skills=?,
           category=?,future_opportunities=?,max_applicants=?,updated_at=?
           WHERE id=? AND admin_id=?""",
        (data["name"].strip(), data["duration"].strip(), data["start_date"].strip(),
         data["description"].strip(), data["skills"].strip(), data["category"].strip(),
         data["future_opportunities"].strip(), parse_max_ap(data.get("max_applicants")),
         now_iso(), oid, session["admin_id"])
    )
    db.commit()
    opp = row_to_dict(db.execute("SELECT * FROM opportunities WHERE id=?", (oid,)).fetchone())
    return jsonify({"message": "Opportunity updated successfully.", "opportunity": opp}), 200

@app.route("/api/opportunities/<oid>", methods=["DELETE"])
@login_required
def delete_opportunity(oid):
    db = get_db()
    if not db.execute("SELECT 1 FROM opportunities WHERE id=? AND admin_id=?",
                      (oid, session["admin_id"])).fetchone():
        return jsonify({"error": "Opportunity not found."}), 404
    db.execute("DELETE FROM opportunities WHERE id=?", (oid,))
    db.commit()
    return jsonify({"message": "Opportunity deleted successfully."}), 200

# ─── Static serving ───────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_static(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "admin.html")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
