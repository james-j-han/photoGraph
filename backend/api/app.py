from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)

# Supabase configuration using environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Create Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    # Get required fields from the request payload
    auth_id = data.get('auth_id')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    
    if not auth_id or not first_name or not last_name:
        return jsonify({'error': 'Missing required fields'}), 400

    # Attempt to insert the new user into the custom 'users' table
    response = supabase.table('users').insert({
        'id': auth_id,
        'first_name': first_name,
        'last_name': last_name
    }).execute()
    
    if response.get('error'):
        # If Supabase returned an error, send it back
        return jsonify({'error': response['error']['message']}), 400
    
    return jsonify({'message': 'User registered successfully', 'data': response.get('data')}), 201

@app.route('/')
def index():
    # Example query to test the connection:
    response = supabase.table('users').select("*").execute()
    return jsonify(response.data)

if __name__ == '__main__':
    app.run(debug=True)