from flask import Flask
from serverstuff import socketio
from routes import main

# create app HERE (no serverstuff file anymore)
app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"

# attach socket handlers
socketio.init_app(app)
app.register_blueprint(main)
import connections
import sockets

if __name__ == "__main__":
    socketio.run(app, debug=True)