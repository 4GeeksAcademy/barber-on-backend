"""
This module takes care of starting the API Server,
Loading the DB and Adding the endpoints
"""
import os
from datetime import timedelta
from flask import Flask, jsonify, send_from_directory, request
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from api.utils import APIException, generate_sitemap
from api.models import db
from api.routes import api, setup_routes
from api.admin import setup_admin
from api.commands import setup_commands

ENV = "development" if os.getenv("FLASK_DEBUG") == "1" else "production"

static_file_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../dist/")

app = Flask(__name__)
app.url_map.strict_slashes = False


# -----------------------------
# Database config
# -----------------------------
db_url = os.getenv("DATABASE_URL")
if db_url is not None:
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url.replace("postgres://", "postgresql://")
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:////tmp/test.db"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# -----------------------------
# JWT config
# -----------------------------
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)


# -----------------------------
# Init extensions
# -----------------------------
MIGRATE = Migrate(app, db, compare_type=True)
db.init_app(app)
jwt = JWTManager(app)


# -----------------------------
# CORS (Codespaces SAFE)
# -----------------------------
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

ALLOWED_LOCAL_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
}
ALLOWED_SUFFIX = ".app.github.dev"


@app.after_request
def add_cors_headers(response):
    """
    Codespaces sometimes fails wildcard matching on preflight.
    This forces correct CORS headers for:
    - https://<anything>.app.github.dev
    - localhost:3000
    """
    origin = request.headers.get("Origin")

    if origin:
        if origin in ALLOWED_LOCAL_ORIGINS or origin.endswith(ALLOWED_SUFFIX):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"

    return response


# -----------------------------
# Admin + Commands
# -----------------------------
setup_admin(app)
setup_commands(app)


# -----------------------------
# Routes
# -----------------------------
setup_routes()
app.register_blueprint(api, url_prefix="/api")


# -----------------------------
# Error handling
# -----------------------------
@app.errorhandler(APIException)
def handle_invalid_usage(error):
    return jsonify(error.to_dict()), error.status_code


@app.errorhandler(500)
def handle_500(err):
    return jsonify({"msg": "Internal server error"}), 500


# -----------------------------
# Sitemap / Static
# -----------------------------
@app.route("/")
def sitemap():
    if ENV == "development":
        return generate_sitemap(app)
    return send_from_directory(static_file_dir, "index.html")


@app.route("/<path:path>", methods=["GET"])
def serve_any_other_file(path):
    if not os.path.isfile(os.path.join(static_file_dir, path)):
        path = "index.html"
    response = send_from_directory(static_file_dir, path)
    response.cache_control.max_age = 0
    return response


# -----------------------------
# Run
# -----------------------------
if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 3001))  # ✅ backend on 3001 by default
    app.run(host="0.0.0.0", port=PORT, debug=True)