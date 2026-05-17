from flask_socketio import emit
from serverstuff import socketio, users, db,login_manager
from flask import request,session
from models import User, UserStat, ChatHistory
from sqlalchemy import select
from flask_login import login_user, logout_user

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def handle_login(user):
    login_user(user)
    session["latest_msgid"] = get_latest_msgid()
    new_chat = ChatHistory(
        from_user="Catquest",
        to_user=user.username,
        message="Welcome to catquest! Visit the shop to check out the latest gear, our delve into the dungeon to battle and get gold!",
        message_type="system"
    )
    db.session.add(new_chat)
    db.session.commit()
    

def handle_logout():
    logout_user()

    

def get_latest_msgid():
    last_msg = db.session.execute(
        db.select(ChatHistory.id).order_by(ChatHistory.id.desc()).limit(1)
    ).scalar()
    return last_msg or 0