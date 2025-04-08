from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
from supabase import create_client, Client
from flask_cors import CORS

load_dotenv()  # Load variables from your .env file

app = Flask(__name__)
CORS(app)  # Enable CORS

# Supabase configuration using environment variables
SUPABASE_URL = os.environ.get("REACT_APP_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("REACT_APP_SUPABASE_ANON_KEY")

# Ensure the variables are correctly loaded
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase URL or Key in environment variables.")

# Create Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    auth_id = data.get('auth_id')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    
    if not auth_id or not first_name or not last_name:
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if user exists
    existing_user = supabase.table('users').select("*").eq('id', auth_id).execute()
    if existing_user.data:  # If there's already a record
        return jsonify({'error': 'User already registered'}), 409

    # Insert new user into the 'users' table
    response = supabase.table('users').insert({
        'id': auth_id,
        'first_name': first_name,
        'last_name': last_name
    }).execute()

    if response.error:
        return jsonify({'error': str(response.error)}), 400
    
    return jsonify({'message': 'User registered successfully', 'data': response.data}), 201

@app.route('/')
def index():
    response = supabase.table('users').select("*").execute()
    return jsonify(response.data)

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not Found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server Error'}), 500

if __name__ == '__main__':
    app.run(debug=True)