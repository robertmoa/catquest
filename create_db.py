from app import create_app
from serverstuff import db
from shop_sockets import seed_swords, seed_armour
from dungeon_sockets import seed_monsters

app = create_app()

with app.app_context():
    db.create_all()
    sword_count = seed_swords()
    hat_count = seed_armour()
    monster_count = seed_monsters()
    print(f"database done")
