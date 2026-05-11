from flask import render_template, Blueprint, redirect, request, url_for, session
from models import User
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash
from serverstuff import db, users
from loginmgmt import handle_login
main = Blueprint("main", __name__)


def require_valid_user():
    """Return the username if the session points to a real DB user, else None.
    Clears the session if the user is missing so the client re-logs in."""
    username = session.get("username")
    if not username:
        return None
    user = db.session.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()
    if user is None:
        session.clear()
        return None
    return username


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
        handle_login(username)
        
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
        handle_login(username)
        return redirect(url_for("main.home"))
    print("user exists")
    return render_template("login.html", error="This username is taken!")




@main.route("/home")
def home():
    username = require_valid_user()
    if username is None:
        return redirect(url_for("main.login_page"))
    return render_template("main.html",user=username,page="dashboard")


@main.route("/dungeon")
def dungeon():
    username = require_valid_user()
    if username is None:
        return redirect(url_for("main.login_page"))
    return render_template("dungeon.html",user=username,page="dungeon")


@main.route("/shop")
def shop():
    username = require_valid_user()
    if username is None:
        return redirect(url_for("main.login_page"))
    return render_template("shop.html",user=username,page="shop")

            
 
 


