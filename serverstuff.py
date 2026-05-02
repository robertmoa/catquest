from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
users = {}
socketio = SocketIO(manage_session=True)
db = SQLAlchemy()