from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import psycopg2

load_dotenv()

app = Flask(__name__)

try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        port=os.getenv('DB_PORT')
    )
    cursor = conn.cursor()
except Exception as e:
    print("❌ Failed to connect to database:", e)

@app.route('/')
def hello_world():
    return 'Hello, World!'