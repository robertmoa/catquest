from flask import Blueprint, session
from models import User, UserItem, UserStat, Sword, Armour,Item
from sqlalchemy import select
from serverstuff import db, socketio

shop = Blueprint("shop", __name__, url_prefix="/shop")

def ensure_user_stat(user):
    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)

    return user.data


def get_item_id(data):
    data = data or {}
    item_id = data.get("item_id")

    if item_id is None:
        return None

    try:
        return int(item_id)
    except (TypeError, ValueError):
        return None


def check_user_owns_item(user, item_id):
    existing = db.session.execute(
        select(UserItem.id).where(
            UserItem.user_id == user.id,
            UserItem.item_id == item_id
        ).limit(1)
    ).first()

    return existing is not None


def equip_item(user, item):
    user_stats = ensure_user_stat(user)

    if item.itype == "sword":
        user_stats.equipped_weapon = item.id
    elif item.itype in ("armour", "armor", "hat"):
        user_stats.equipped_armour = item.id

    return user_stats


@socketio.on("get_item_specialprompt")
def get_item_specialprompt(data):
    item_id = get_item_id(data)

    if item_id is None:
        return {"specialprompt": []}

    item = db.session.execute(
        select(Item).where(Item.id == item_id)
    ).scalar_one_or_none()

    if item is None:
        return {"specialprompt": []}

    return {"specialprompt": item.specialprompt or []}


@socketio.on("get_all_items")
def handle_getting_items(data):
    all_items = Item.query.all()
    username = session.get("username")
    owned_item_ids = set()

    if username is not None:
        user = db.session.execute(
            select(User).where(User.username == username)
        ).scalar_one_or_none()

        if user is not None:
            owned_item_ids = {
                user_item.item_id
                for user_item in user.items
            }

    payload = []

    for item in all_items:
        item_data = item.to_dict()
        item_data["owned"] = item.id in owned_item_ids
        payload.append(item_data)

    print(payload)
    return payload

@socketio.on("add_gold")
def handle_add_gold(data):
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

    amount = int(data.get("amount", 500))
    user.data.gold += amount
    db.session.commit()

    return {
        "success": True,
        "gold": user.data.gold,
        "added": amount
    }


@socketio.on("buy_item")
def buy_item(data):
    username = session.get("username")

    if username is None:
        return {"success": False, "error": "Not logged in"}

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"success": False, "error": "User not found"}

    user_stats = ensure_user_stat(user)
    item_id = get_item_id(data)

    if item_id is None:
        return {"success": False, "error": "Missing item_id", "gold": user_stats.gold}

    item = db.session.execute(
        select(Item).where(Item.id == item_id)
    ).scalar_one_or_none()

    if item is None:
        return {"success": False, "error": "Item not found", "gold": user_stats.gold}

    if check_user_owns_item(user, item.id):
        return {
            "success": False,
            "owned": True,
            "gold": user_stats.gold,
            "item_id": item.id,
            "item_type": item.itype,
            "equipped_weapon": user_stats.equipped_weapon,
            "equipped_armour": user_stats.equipped_armour,
        }

    if user_stats.gold < item.cost:
        return {
            "success": False,
            "error": "Not enough gold",
            "gold": user_stats.gold,
            "item_id": item.id,
            "item_type": item.itype,
        }

    user_stats.gold -= item.cost
    user_item = UserItem(
        user_id=user.id,
        item_id=item.id
    )

    db.session.add(user_item)
    db.session.commit()

    return {
        "success": True,
        "owned": True,
        "gold": user_stats.gold,
        "item_id": item.id,
        "item_type": item.itype,
        "cost": item.cost,
        "equipped_weapon": user_stats.equipped_weapon,
        "equipped_armour": user_stats.equipped_armour,
    }


@socketio.on("spend_gold")
def handle_spend_gold(data):
    username = session.get("username")

    if username is None:
        return {"success": False, "error": "Not logged in"}
    
    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"success": False, "error": "User not found"}

    ensure_user_stat(user)
    
    data = data or {}
    cost = data.get("cost")

    if cost is None:
        return {"success": False, "error": "Missing cost", "gold": user.data.gold}

    cost = int(cost)

    if user.data.gold < cost:
        return {"success": False, "gold": user.data.gold}

    user.data.gold -= cost
    db.session.commit()

    return {"success": True, "gold": user.data.gold}


@socketio.on("own_item")
def own_item(data):
    username = session.get("username")

    if username is None:
        return {"success": False, "error": "Not logged in"}

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"success": False, "error": "User not found"}

    ensure_user_stat(user)
    item_id = get_item_id(data)

    if item_id is None:
        return {"success": False, "error": "Missing item_id"}

    if check_user_owns_item(user, item_id):
        return {"success": False, "owned": True, "error": "User already owns this item"}


    item = db.session.execute(
        select(Item).where(Item.id == item_id)
    ).scalar_one_or_none()

    if item is None:
        return {"success": False, "error": "Item not found"}


    user_item = UserItem(
        user_id=user.id,
        item_id=item.id
    )

    db.session.add(user_item)
    equip_item(user, item)
    db.session.commit()

    return {
        "success": True,
        "item_id": item.id,
        "item_type": item.itype,
        "equipped_weapon": user.data.equipped_weapon,
        "equipped_armour": user.data.equipped_armour,
    }


@socketio.on("check_own_item")
def check_own_item(data):
    username = session.get("username")

    if username is None:
        return {"owns": False}

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"owns": False}

    item_id = get_item_id(data)

    if item_id is None:
        return {"owns": False}

    return {"owns": check_user_owns_item(user, item_id)}


@socketio.on("equip_item")
def handle_equip_item(data):
    username = session.get("username")

    if username is None:
        return {"success": False, "error": "Not logged in"}

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    if user is None:
        return {"success": False, "error": "User not found"}

    user_stats = ensure_user_stat(user)
    item_id = get_item_id(data)

    if item_id is None:
        return {"success": False, "error": "Missing item_id"}

    item = db.session.execute(
        select(Item).where(Item.id == item_id)
    ).scalar_one_or_none()

    if item is None:
        return {"success": False, "error": "Item not found"}

    if not check_user_owns_item(user, item.id):
        return {"success": False, "error": "You do not own this item"}

    equip_item(user, item)
    db.session.commit()

    return {
        "success": True,
        "item_id": item.id,
        "item_type": item.itype,
        "equipped_weapon": user_stats.equipped_weapon,
        "equipped_armour": user_stats.equipped_armour,
    }






























SWORD_DATA = [
    {
        "name": "Short Longsword",
        "cost": 5,
        "description": "The shortest longsword in all the realms.",
        "specialprompt": [
            "It may be short, but it is a long sword at the end of the day.\n\nBuy Short Longsword for 5 gold?"
        ],
        "imgpath": "/static/images/Swords/Short Longsword.png",
        "attack": 2,
        "crit_chance": 0.03,
    },
    {
        "name": "An Above Average Sized Dagger",
        "cost": 15,
        "description": "I assure you, it is above average size and very funny.",
        "specialprompt": [
            "I assure you, I am actually above average size AND I am really funny\n\nBuy An Above Average Sized Dagger for 15 gold?"
        ],
        "imgpath": "/static/images/Swords/An Above Average Sized Dagger.png",
        "attack": 4,
        "crit_chance": 0.08,
    },
    {
        "name": "Chilly Cutlass",
        "cost": 25,
        "description": "'Really damn cold' - someone who was hit by the chilly cutlass",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Chilly Cutlass.png",
        "attack": 6,
        "crit_chance": 0.10,
    },
    {
        "name": "Rapier of Death and Despair",
        "cost": 35,
        "description": "Its evil I've heard",
        "specialprompt": ["'Hey you, yeah you, I'm talking to you. You suck lol'\n\nBuy Rapier of Death and Despair for 35 gold?"],
        "imgpath": "/static/images/Swords/Rapier of Death and Despair.png",
        "attack": 7,
        "crit_chance": 0.12,
    },
    {
        "name": "Sexy Saber",
        "cost": 50,
        "description": "A blade that speaks two languages, English and 'The Drip' - call it Blingual",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Sexy Saber.png",
        "attack": 10,
        "crit_chance": 0.15,
    },
    {
        "name": "ScHIMitar",
        "cost": 65,
        "description": "Curvy, sharp, and 'The man''.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/ScHIMitar.png",
        "attack": 13,
        "crit_chance": 0.17,
    },
    {
        "name": "Nuclear Flamebringer Deathknife",
        "cost": 80,
        "description": "His brothers name is Dave.",
        "specialprompt": None,
        "imgpath": "/static/images/Swords/Nuclear Flamebringer Deathknife.png",
        "attack": 15,
        "crit_chance": 0.20,
    },
    {
        "name": "Wooden Sword",
        "cost": 100,
        "description": "Trust me, it is really strong wood.",
        "specialprompt": [
            "Like I said, it's really strong wood\n\nBuy Wooden Sword for 100 gold?"
        ],
        "imgpath": "/static/images/Swords/Wooden Sword.png",
        "attack": 18,
        "crit_chance": 0.22,
    },
    {
        "name": "Sword of Uncertainty",
        "cost": 1339,
        "description": "Not a soul knows if this is a good idea, especially the sword.",
        "specialprompt": [
            "Are you sure you want to purchase this sword",
            "You're super certain?",
            "But are you really sure? Like deadset you know you want this",
            "This is my fourth time asking you. You must really want this, right?",
            "Last chance! Theres no going back now",
        ],
        "imgpath": "/static/images/Swords/Sword of Uncertainty.png",
        "attack": 100,
        "crit_chance": 0.33,
    },
]

ARMOUR_DATA = [
    {
        "name": "Lensless Glasses",
        "cost": 10,
        "description": "They're just the frame.",
        "specialprompt": None,
        "imgpath": "/static/images/Hats/Lensless Glasses.png",
        "defense": 2,
        "dodge_chance": 0.02,
    },
    {
        "name": "Magic Man Hat",
        "cost": 20,
        "description": "'It's magical I swear' - the man who sold me the hat.",
        "specialprompt": None,
        "imgpath": "/static/images/Hats/Magic Man Hat.png",
        "defense": 4,
        "dodge_chance": 0.04,
    },
    {
        "name": "Crown of Pure Lead",
        "cost": 35,
        "description": "You should definitely wear this.",
        "specialprompt": [
            "On second thought, maybe you should EAT this hat\n\nBuy The Crown of Pure Lead for 35 gold?"
        ],
        "imgpath": "/static/images/Hats/Crown Of Pure Lead.png",
        "defense": 6,
        "dodge_chance": 0.06,
    },
    {
        "name": "Slayer of Gods",
        "cost": 45,
        "description": "You heard it.",
        "specialprompt": None,
        "imgpath": "/static/images/Hats/Slayer of Gods.png",
        "defense": 8,
        "dodge_chance": 0.08,
    },
    {
        "name": "Pants",
        "cost": 60,
        "description": "Yes this is a hat, yes you wear them on your head.",
        "specialprompt": None,
        "imgpath": "/static/images/Hats/Pants.png",
        "defense": 10,
        "dodge_chance": 0.10,
    },
    {
        "name": "Sigma Alpha Hat",
        "cost": 75,
        "description": "Only the rizziest alpha sigma male lone wolf can wear this hat *howls*",
        "specialprompt": [
            "I am so sorry for that\n\nBuy the Sigma Alpha Hat for 75 gold?"
        ],
        "imgpath": "/static/images/Hats/Sigma Alpha Hat.png",
        "defense": 12,
        "dodge_chance": 0.12,
    },
    {
        "name": "Cool Person Hat",
        "cost": 90,
        "description": "This ones not for you, keep on walking pal.",
        "specialprompt": None,
        "imgpath": "/static/images/Hats/Cool Person Hat.png",
        "defense": 15,
        "dodge_chance": 0.15,
    },
    {
        "name": "Teeny Tiny Eenie Weenie Top Hat",
        "cost": 100,
        "description": "'For entrepeneurs' he whispered quitely and sneakily'",
        "specialprompt": None,
        "imgpath": "/static/images/Hats/Teeny Tiny Eenie Weenie Top Hat.png",
        "defense": 18,
        "dodge_chance": 0.18,
    },
    {
        "name": "Hat of Uncertainty",
        "cost": 1339,
        "description": "No one knows if this is a good idea... buy it.",
        "specialprompt": [
            "Are you sure you want to buy this hat",
            "You're super certain?",
            "But are you really sure? Super duper certain",
            "You must really want this",
            "Last chance! Can't turn back now",
        ],
        "imgpath": "/static/images/Hats/Hat of Uncertainty.png",
        "defense": 20,
        "dodge_chance": 0.20,
    },
]

def seed_armour():
    for armour_data in ARMOUR_DATA:
        armour = db.session.execute(
            select(Armour).where(Armour.name == armour_data["name"])
        ).scalar_one_or_none()

        if armour is None:
            armour = Armour(itype="armour")
            db.session.add(armour)

        for key, value in armour_data.items():
            setattr(armour, key, value)
    
    db.session.commit()
    return len(ARMOUR_DATA)

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
