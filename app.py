from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("main.html")

@app.route("/dungeon")
def dungeon():
    return render_template("dungeon.html")

@app.route("/shop")
def shop():
    return render_template("shop.html")

if __name__ == "__main__":
    app.run(debug=True)