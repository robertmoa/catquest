from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import select
from flask_login import LoginManager
users = {}
socketio = SocketIO(manage_session=True)
db = SQLAlchemy()
login_manager = LoginManager()
