from flask import render_template, Blueprint, redirect, request, url_for, session, jsonify
from models import User, UserStat
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash
from serverstuff import db,users
main = Blueprint("main", __name__)


@main.route("/", methods=["GET"])
def login_page():
    return render_template("login.html")
@main.route("/login", methods=["POST"])
def login():
    username = request.form.get("username")
    password = request.form.get("password")

    stmt = select(User).where(User.username == username)
    user = db.session.execute(stmt).scalar_one_or_none()

    if user and check_password_hash(user.password, password):
        session["username"] = username
        print(session["username"])
        return redirect(url_for("main.home"))
    return render_template("login.html", error="Username/password is not correct")

@main.route("/signup",methods=["POST"])
def signup():
    username = request.form.get("username")
    password = request.form.get("password")
    stmt = select(User).where(User.username == username)
    user = db.session.execute(stmt).scalar_one_or_none()
    #this tells us that no user by that name is in User table, thus create it
    if user == None:
        print("making new entry...")
        pw_hashed = generate_password_hash(password)
        new_user_entry = User(username=username,password=pw_hashed)
        db.session.add(new_user_entry)
        db.session.commit()
        session["username"] = username
        return redirect(url_for("main.home"))
    print("user exists")
    return render_template("login.html", error="This username is taken!")




@main.route("/home")
def home():
    return render_template("main.html")


@main.route("/dungeon")
def dungeon():
    return render_template("dungeon.html")


@main.route("/shop")
def shop():
    return render_template("shop.html")

 
 
@main.route("/get_user_stats", methods=["GET"])
def get_user_stats():
    username = session.get("username")

    if username is None:
        return jsonify({"error": "Not logged in"}), 401

    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    # make sure UserStat exists
    if user.data is None:
        user.data = UserStat(gold=0, xp=0, level=0)
        db.session.commit()

    return jsonify({
        "gold": user.data.gold,
        "xp": user.data.xp,
        "level": user.data.level
    })

@main.route("/get_user_info", methods=["GET"])
def get_user_info():
    username = session.get("username")
    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()

    return jsonify({
        "idnum": user.idnum,
        "username": user.username,
    })
            
 
 



