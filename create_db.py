from flask import Flask
from serverstuff import socketio, db
from routes import main

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# attach socket and database to app
db.init_app(app)
socketio.init_app(app)
# register the routes
app.register_blueprint(main)

with app.app_context():
    db.create_all
    print("database done")
