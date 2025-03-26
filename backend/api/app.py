
from flask import Flask, request, jsonify
from routes.users import user_routes
from flask_session import Session
import os

app = Flask(__name__)

app.register_blueprint(user_routes, url_prefix="/api/users")

app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True  # Adds extra security
app.secret_key = os.getenv("SESSION_SECRET_KEY", "supersecretkey")

# Initialize Flask-Session
Session(app)

if __name__ == "__main__":
    app.run(debug=True)
