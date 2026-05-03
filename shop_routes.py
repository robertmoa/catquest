from flask import Blueprint, request, session, jsonify
from models import User, UserStat, Sword
from sqlalchemy import select
from serverstuff import db

shop = Blueprint("shop", __name__, url_prefix="/shop")



 #this is a test route to add gold to the user, will be used for testing the shop and dungeon rewards, but also for testing the user stat table and its relationship with the user table in general. Will be deleted eventually, but for now it is here to make sure that the user stat table is working as intended, and that we can update values in it and have those changes reflected in the database.
@shop.route("/add-gold", methods=["POST"])
def add_gold():
    username = session.get("username")

    if username is None:
        return jsonify({"error": "Not logged in"}), 401

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return jsonify({"error": "User not found"}), 404

    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)

    data = request.get_json(silent=True) or {}
    amount = int(data.get("amount", 500))
    user.data.gold += amount
    db.session.commit()

    return jsonify({"gold": user.data.gold, "added": amount})


@shop.route("/spend-gold", methods=["POST"])
def spend_gold():
    username = session.get("username")

    if username is None:
        return jsonify({"error": "Not logged in"}), 401
    
    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return jsonify({"error": "User not found"}), 404

    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)
    
    data = request.get_json(silent=True) or {}
    cost = data.get("cost")

    if cost is None:
        return jsonify({"error": "Missing cost"}), 400

    cost = int(cost)

    if user.data.gold < cost:
        return jsonify({"success": False, "gold": user.data.gold}), 400

    user.data.gold -= cost
    db.session.commit()

    return jsonify({"success": True, "gold": user.data.gold})




SWORD_DATA = [
    {
        "name": "Short Longsword",
        "cost": 5,
        "description": "The shortest longsword in all the realms.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Short Longsword.png",
        "attack": 4,
        "crit_chance": 0.03,
    },
    {
        "name": "An Above Average Sized Dagger",
        "cost": 15,
        "description": "I assure you, it is above average size and very funny.",
        "specialprompt": [
            "I assure you, I am actually above average size AND I am really funny"
        ],
        "imgpath": "/static/images/Swords/An Above Average Sized Dagger.png",
        "attack": 7,
        "crit_chance": 0.08,
    },
    {
        "name": "Chilly Cutlass",
        "cost": 25,
        "description": "Cold to the touch, rude to enemies.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Chilly Cutlass.png",
        "attack": 10,
        "crit_chance": 0.10,
    },
    {
        "name": "Rapier of Death and Despair",
        "cost": 35,
        "description": "A dramatic blade for dramatic consequences.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Rapier of Death and Despair.png",
        "attack": 14,
        "crit_chance": 0.12,
    },
    {
        "name": "Sexy Saber",
        "cost": 50,
        "description": "A blade with confidence and questionable priorities.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Sexy Saber.png",
        "attack": 18,
        "crit_chance": 0.15,
    },
    {
        "name": "ScHIMitar",
        "cost": 65,
        "description": "Curved, sharp, and weirdly proud of its spelling.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/ScHIMitar.png",
        "attack": 23,
        "crit_chance": 0.17,
    },
    {
        "name": "Nuclear Flamebringer Deathknife",
        "cost": 80,
        "description": "His brothers name is Dave.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Nuclear Flamebringer Deathknife.png",
        "attack": 30,
        "crit_chance": 0.20,
    },
    {
        "name": "Wooden Sword",
        "cost": 100,
        "description": "Trust me, it is really strong wood.",
        "specialprompt": [
            "Trust me, it's really strong wood"
        ],
        "imgpath": "/static/images/Swords/Wooden Sword.png",
        "attack": 38,
        "crit_chance": 0.22,
    },
    {
        "name": "Sword of Uncertainty",
        "cost": 1339,
        "description": "Nobody knows if this is a good idea, especially the sword.",
        "specialprompt": [
            "Are you sure you want to purchase this sword",
            "Youre 100% certain?",
            "But are you really sure? Like deadset you know you want this",
            "This is your fourth confirmation. You must really want this, right?",
            "Last chance! Theres no going back now",
        ],
        "imgpath": "/static/images/Swords/Sword of Uncertainty.png",
        "attack": 133,
        "crit_chance": 0.33,
    },
]

def seed_swords():
    for sword_data in SWORD_DATA:
        sword = db.session.execute(
            select(Sword).where(Sword.name == sword_data["name"])
        ).scalar_one_or_none()


        if sword is None:
            sword = Sword(itype="sword")
            db.session.add(sword)

        for key, value in sword_data.items():
            setattr(sword, key, value)
    
    db.session.commit()
    return len(SWORD_DATA)