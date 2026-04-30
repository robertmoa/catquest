from flask import render_template, Blueprint, redirect, request, url_for

main = Blueprint("main", __name__)


@main.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        return redirect(url_for("main.home"))

    return render_template("login.html")


@main.route("/home")
def home():
    return render_template("main.html")


@main.route("/dungeon")
def dungeon():
    return render_template("dungeon.html")


@main.route("/shop")
def shop():
    return render_template("shop.html")
