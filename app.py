from flask import Flask
from serverstuff import socketio, db
from routes import main
from shop_routes import shop
from flask_migrate import Migrate

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "secret!"
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # attach socket and database to app
    db.init_app(app)
    migrate = Migrate(app,db)
    migrate.init_app(app)
    socketio.init_app(app)
    # register the routes
    app.register_blueprint(main)
    app.register_blueprint(shop)

    import models

    

    import connections
    import sockets
    import user_handling

    return app
if __name__ == "__main__":
    app = create_app()
    socketio.run(app, debug=True)
    
