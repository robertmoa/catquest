from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import select
users = {}
socketio = SocketIO(manage_session=True)
db = SQLAlchemy()
