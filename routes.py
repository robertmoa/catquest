from flask import render_template,Blueprint
main = Blueprint("main",__name__)
@main.route("/")
def home():
    return render_template("main.html")

@main.route("/dungeon")
def dungeon():
    return render_template("dungeon.html")

@main.route("/shop")
def shop():
    return render_template("shop.html")