from flask import render_template, Blueprint, redirect, request, url_for, session
from flask_login import login_required,current_user
from models import User
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash
from serverstuff import db, users
from loginmgmt import handle_login, handle_logout
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
        handle_login(user)
        
        return redirect(url_for("main.home"))
    return render_template("login.html", error="Username/password is not correct")
@main.route("/logout", methods=["POST"])
def logout():
    handle_logout()
    return render_template("login.html", error="Logged Out.")



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
        handle_login(new_user_entry)
        return redirect(url_for("main.home"))
    print("user exists")
    return render_template("login.html", error="This username is taken!")




@main.route("/home")
@login_required
def home():
    username = current_user.username

    return render_template("main.html",user=username,page="dashboard")


@main.route("/dungeon")
@login_required
def dungeon():
    username = current_user.username
    if username is None:
        return redirect(url_for("main.login_page"))
    return render_template("dungeon.html",user=username,page="dungeon")


@main.route("/shop")
@login_required
def shop():
    username = current_user.username
    if username is None:
        return redirect(url_for("main.login_page"))
    return render_template("shop.html",user=username,page="shop")

            
 
 


