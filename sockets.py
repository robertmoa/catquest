from flask_socketio import emit
from serverstuff import socketio, users, db
from flask import request,session
from models import User, UserStat, ChatHistory, UserItem, Sword, Armour, Item
from shop_sockets import ensure_user_stat
from sqlalchemy import select, desc
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
    noitems = False
    # Means a new user
    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)
        noitems = True
        db.session.commit()


    if noitems == True or user.data.equipped_weapon == None or user.data.equipped_armour == None:
        attack = 2
        crit_chance = 0
        defense = 0
      
    else:
        weapon = db.session.get(Item, user.data.equipped_weapon)
        attack = weapon.attack
        crit_chance = weapon.crit_chance
        hat = db.session.get(Item, user.data.equipped_armour)
        defense = hat.defense

    return {
        "success": True,
        "gold": user.data.gold,
        "xp": user.data.xp,
        "level": user.data.level,
        "damage": attack,
        "crit_chance": crit_chance,
        "defense": defense,

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

@socketio.on("get_user_items")
def get_items(data=None):
    username = session.get("username")
    if username is None:
        return []
    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()
    if user is None:
        return []
    user_stats = ensure_user_stat(user)
    payload = []
    for user_item in user.items:
        item = user_item.item
        itemdata = {
            "id": item.id,
            "name": item.name,
            "imgpath": item.imgpath,
            "type": item.itype,
            "description": item.description,
        }
        if isinstance(item, Sword):
            itemdata["attack"] = item.attack
            itemdata["equipped"] = item.id == user_stats.equipped_weapon
        else:
            itemdata["defense"] = item.defense
            itemdata["equipped"] = item.id == user_stats.equipped_armour
        payload.append(itemdata)
    return payload

@socketio.on("get_leaderboard")
def get_top_5_gold(data=None):
    top_users = (
    db.session.query(User)
    .join(UserStat)
    .order_by(UserStat.gold.desc())
    .limit(5)
    .all()
    )
    payload = []
    for index, user in enumerate(top_users, start=1):
        payload.append({"number": index,"username": user.username, "gold": user.data.gold})
    print(payload)
    return payload
