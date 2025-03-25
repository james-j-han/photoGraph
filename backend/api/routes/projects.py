from flask import Blueprint, request, jsonify
from db import connection
a
project_routes = Blueprint("projects", __name__)

@project_routes.route("/", methods=["GET"])
def get_projects():
    with connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT project_name, project_description FROM projects;")
            return jsonify(cursor.fetchall())

@project_routes.route("/<int:project_id>", methods=["GET"])
def get_project(project_id):
    with connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT project_name, project_description FROM projects WHERE project_id = %s;", (project_id,))
            project = cursor.fetchone()
            if project:
                return jsonify({"project_name": project[0], "project_description": project[1]})
            else:
                return jsonify({"error": "Project not found"}), 404