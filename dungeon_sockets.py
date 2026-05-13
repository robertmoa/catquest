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
@socketio.on("get_stats")


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
        "name": "Slime",
        "description": "A boring slime.",
        "imgpath": "/static/images/Enemy/DefaultSlime.png",
        "entrymsg": "A Slime bounces towards you! how boring...",
        "max_hp": 12,
        "damage": 2,
        "reward": 10,
    },
    {
        "name": "Zombie Cat",
        "description": "A cat, forgotten to the dungeon.",
        "imgpath": "/static/images/Enemy/ZombieCat.png",
        "entrymsg": "A Zombie Cat lunges from the shadows!",
        "max_hp": 20,
        "damage": 5,
        "reward": 20,
    },
    {
        "name": "Common Dog",
        "description": "A very angry looking dog, it appears to be a beagle.",
        "imgpath": "/static/images/Enemy/DogCommon.png",
        "entrymsg": "A Common Dog barks and snarls in your direction!",
        "max_hp": 35,
        "damage": 8,
        "reward": 30,
    },
        {
        "name": "Armoured Dog",
        "description": "His armour and sword are polished impeccably.",
        "imgpath": "/static/images/Enemy/DogArmoured.png",
        "entrymsg": "An Armoured Dog unsheaths his sword!",
        "max_hp": 90,
        "damage": 12,
        "reward": 35,
    },
    {
        "name": "Dog Sorcerer",
        "description": "A dog that has studied forbidden arcane arts.",
        "imgpath": "/static/images/Enemy/DogCultist.png",
        "entrymsg": "A Dog Sorcerer appears, eyes glowing. It begins to chant...",
        "max_hp": 90,
        "damage": 6,
        "reward": 100,
        "special_type": "sorcerer",
    },
    {
        "name": "General Scratch",
        "description": "Many cats have tried to stop him, judging by the scratch on his eye.",
        "imgpath": "/static/images/Enemy/GeneralScratch.png",
        "entrymsg": "General Scratch appears. His eye glares at you.",
        "max_hp": 200,
        "damage": 30,
        "reward": 1000,
        "special_type": "finalboss",
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
