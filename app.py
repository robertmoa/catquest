from flask import Flask, redirect, render_template, request, url_for

app = Flask(__name__)

@app.route("/")
def root():
    return render_template("login.html")

@app.route("/main")
def home():
    return render_template("main.html")

@app.route("/dungeon")
def dungeon():
    return render_template("dungeon.html")

@app.route("/shop")
def shop():
    return render_template("shop.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        return redirect(url_for("home"))

    return render_template("login.html")


if __name__ == "__main__":
    app.run(debug=True)
