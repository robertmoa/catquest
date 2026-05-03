from flask import Blueprint, request, session, jsonify
from models import User, UserStat
from sqlalchemy import select
from serverstuff import db

shop = Blueprint("shop", __name__, url_prefix="/shop")



 #this is a test route to add gold to the user, will be used for testing the shop and dungeon rewards, but also for testing the user stat table and its relationship with the user table in general. Will be deleted eventually, but for now it is here to make sure that the user stat table is working as intended, and that we can update values in it and have those changes reflected in the database.
@shop.route("/add-gold", methods=["POST"])
def add_gold():
    username = session.get("username")


    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()


    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)

    amount = 500
    user.data.gold += amount
    db.session.commit()

    return jsonify({"gold": user.data.gold, "added": amount})


@shop.route("/buy-item", methods=["POST"])
def buy_item():
    username = session.get("username")

    if username is None:
        return jsonify({"error": "Not logged in"}), 401
    
    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()