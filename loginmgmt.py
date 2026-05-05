from flask_socketio import emit
from serverstuff import socketio, users, db
from flask import request,session
from models import User, UserStat, ChatHistory
from sqlalchemy import select

def handle_login(username):
    session["username"] = username
    session["latest_msgid"] = get_latest_msgid()
    print(session["latest_msgid"])
def get_latest_msgid():
    last_msg = db.session.execute(
        db.select(ChatHistory.id).order_by(ChatHistory.id.desc()).limit(1)
    ).scalar()
    return last_msg or 0