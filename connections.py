from flask_socketio import emit, join_room, leave_room
from flask import request,session
from serverstuff import socketio, users
#gets the users dictionary from serverstuff


@socketio.on('connect')
def handle_connect():
    users[session["username"]] = request.sid
    print(users)
    join_room(session["username"])

@socketio.on('disconnect')
def handle_disconnect():
    leave_room(session["username"])
    users.pop(session["username"])
    print(users)
