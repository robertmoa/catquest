from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
users = {}
socketio = SocketIO()
db = SQLAlchemy()