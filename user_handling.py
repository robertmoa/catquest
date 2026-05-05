from werkzeug.security import check_password_hash, generate_password_hash
from serverstuff import socketio,db,users
from models import User
from flask_socketio import emit, join_room, leave_room
from flask import session, request





@socketio.on("connect")
def connection():
    users[session["username"]] = request.sid
    join_room(session["username"])

@socketio.on("disconnect")
def disconnection():
    del users[session["username"]]
    leave_room(session["username"])

