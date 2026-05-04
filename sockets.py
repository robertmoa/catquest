from flask_socketio import emit
from serverstuff import socketio, users, db
from flask import request,session
from models import User, UserStat, ChatHistory
from sqlalchemy import select
#handles chat messages including whispering

@socketio.on('chatmsg')
def handle_chatmsg(msg):
    msg['userid'] = session["username"]
    #prints message -- CHANGE TO USERNAME WHEN LOGIN STUFF FINISHED
    print(f"Received message from {session['username']}: {msg['txt']}")
    #sets style to empty, so that a normal message will be non specific
    msg['style'] = ''
    #As we dont know if it is a whisper or not, this sets target_user to none at first
    target_user = None
    
    #case 1, empty message, do not emit
    if msg['txt'] == '':
        print("empty message, not broadcasting")
        return
    

    #case 2 whisper
    if msg['txt'].startswith('/w '):
        message = msg['txt'][3:].split(' ')
        target_user = message[0]
        if target_user not in users.values():
            feedbackmsg = {
            'userid': 'CatQuest',
            'txt': "Player not found, make sure you have the correct username and that they are online.",
            'style': 'text-danger fst-italic'
            }
            emit('chatmsg', feedbackmsg, room=msg['userid'])
            return
            
        msg['txt'] = ' '.join(message[1:])
        msg['style'] = 'text-muted fst-italic'

        feedbackmsg = msg.copy()
        feedbackmsg['userid'] = f"to {target_user}"
        emit('chatmsg', msg, room=target_user)
        emit('chatmsg', feedbackmsg, room=msg['userid'])
        return
    

    #regular message
    else:
        emit('chatmsg', msg, broadcast=True)
    
    #At the end, add it to chat history table
    new_chat = ChatHistory(from_user=session["username"],to_user=target_user,message=msg['txt'])
    db.session.add(new_chat)
    db.session.commit()
    return




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