from flask import session
from sqlalchemy import select
from models import User, UserStat, Monster
from serverstuff import db, socketio

@socketio.on("save_progress")
def handle_save_progress(data):
    username = session.get("username")

    if username is None:
        return {"success": False, "error": "Not logged in"}

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"success": False, "error": "User not found"}

    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)

    user.data.xp = int(data.get("xp", user.data.xp))
    user.data.level = int(data.get("level", user.data.level))
    db.session.commit()

    return {"success": True, "xp": user.data.xp, "level": user.data.level}


@socketio.on("get_monsters")
def handle_get_monsters(data=None):
    monsters = Monster.query.all()

    if not monsters:
        return {"success": False, "error": "No monsters in DB — run seed_monsters()"}

    payload = [
        {
            "id": m.id,
            "name": m.name,
            "description": m.description,
            "imgpath": m.imgpath,
            "entrymsg": m.entrymsg,
            "max_hp": m.max_hp,
            "damage": m.damage,
            "reward": m.reward,
            "special_type": m.special_type,
        }
        for m in monsters
    ]

    return {"success": True, "monsters": payload}


MONSTER_DATA = [
    {
        "name": "Angry Cat",
        "description": "A very grumpy cat. Don't pet it.",
        "imgpath": "/static/images/ecatsprite.png",
        "entrymsg": "An Angry Cat appears and hisses at you!",
        "max_hp": 20,
        "damage": 4,
        "reward": 10,
    },
    {
        "name": "Feral Tabby",
        "description": "Scraggly, fast, and furious.",
        "imgpath": "/static/images/ecatsprite.png",
        "entrymsg": "A Feral Tabby lunges from the shadows!",
        "max_hp": 35,
        "damage": 7,
        "reward": 20,
    },
    {
        "name": "Shadow Cat",
        "description": "You can barely see it.",
        "imgpath": "/static/images/ecatsprite.png",
        "entrymsg": "A Shadow Cat materialises from the darkness...",
        "max_hp": 50,
        "damage": 12,
        "reward": 40,
    },
    {
        "name": "Sorcerer Cat",
        "description": "A cat that has studied forbidden arcane arts.",
        "imgpath": "/static/images/ecatsprite.png",
        "entrymsg": "A Sorcerer Cat appears, eyes glowing. It begins to chant...",
        "max_hp": 45,
        "damage": 6,
        "reward": 35,
        "special_type": "sorcerer",
    },
]

def seed_monsters():
    for monster_data in MONSTER_DATA:
        existing = db.session.execute(
            select(Monster).where(Monster.name == monster_data["name"])
        ).scalar_one_or_none()

        if existing is None:
            monster = Monster()
            db.session.add(monster)
        else:
            monster = existing

        for key, value in monster_data.items():
            setattr(monster, key, value)

    db.session.commit()
    return len(MONSTER_DATA)
