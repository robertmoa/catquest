from werkzeug.security import check_password_hash, generate_password_hash
from serverstuff import socketio,db,users
from models import User
from flask_socketio import emit
from flask import session, request




@socketio.on("connect")
def connection():
    users[session["username"]] = request.sid

@socketio.on("disconnect")
def disconnection():
    del users[session["username"]]


