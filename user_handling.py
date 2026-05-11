from werkzeug.security import check_password_hash, generate_password_hash
from serverstuff import socketio,db,users
from models import User
from flask_socketio import emit, join_room, leave_room
from flask import session, request





@socketio.on("connect")
def connection():
    username = session.get("username")
    if username:
        users[username] = request.sid
        join_room(username)

@socketio.on("disconnect")
def disconnection():
    username = session.get("username")
    if username and username in users:
        del users[username]
        leave_room(username)

