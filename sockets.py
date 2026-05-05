from flask_socketio import emit
from serverstuff import socketio, users, db
from flask import request,session
from models import User, UserStat, ChatHistory
from sqlalchemy import select
#handles chat messages including whispering

@socketio.on('chatmsg')
def handle_chatmsg(msg):
    username = session.get("username")
    text = msg.get("txt", "").strip()

    if not text:
        return

    target_user = None
    msg_type = "global"

    # --- WHISPER ---
    if text.startswith('/w '):
        parts = text[3:].split(' ', 1)

        if len(parts) < 2:
            emit('chatmsg', {
                "type": "system",
                "text": "Invalid whisper format. Use /w username message"
            }, room=username)
            return

        target_user, text = parts

        if target_user not in users.keys():
            emit('chatmsg', {
                "type": "system",
                "text": "Player not found."
            }, room=username)
            return

        msg_type = "pm"

        payload = {
            "type": "pm",
            "from": username,
            "to": target_user,
            "text": text
        }

        emit('chatmsg', payload, room=target_user)
        emit('chatmsg', payload, room=username)

    # --- GLOBAL ---
    else:
        payload = {
            "type": "global",
            "from": username,
            "text": text
        }

        emit('chatmsg', payload, broadcast=True)

    # --- SAVE ---
    new_chat = ChatHistory(
        from_user=username,
        to_user=target_user,
        message=text,
        #message_type=msg_type
    )
    db.session.add(new_chat)
    db.session.commit()

@socketio.on("get_my_chat_history")
def get_msgs(data):
    username = session["username"]
    messages = db.session.execute(
    db.select(ChatHistory)
    .where(ChatHistory.id > session["latest_msgid"])
    ).scalars().all()
    payload = []
    for msg in messages:
        if msg.message_type == "pm":
            if msg.from_user != username and msg.to_user != username:
                continue
        
        payload.append({
        "id": msg.id,
        "from": msg.from_user,
        "to": msg.to_user,
        "text": msg.message,
        "type": msg.message_type,
        })
        
    return payload

@socketio.on("get_user_stats")
def get_user_stats(data=None):
    username = session.get("username")

    if username is None:
        return {"success": False, "error": "Not logged in"}

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"success": False, "error": "User not found"}

    # make sure UserStat exists
    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)
        db.session.commit()

    return {
        "success": True,
        "gold": user.data.gold,
        "xp": user.data.xp,
        "level": user.data.level
    }

@socketio.on("get_user_info")
def get_user_info(data=None):
    username = session.get("username")

    if username is None:
        return {"success": False, "error": "Not logged in"}

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"success": False, "error": "User not found"}

    return {
        "success": True,
        "id": user.id,
        "username": user.username,
    }