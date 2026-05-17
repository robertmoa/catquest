from flask import Flask
from serverstuff import socketio, db,login_manager
from routes import main
from shop_sockets import shop
from flask_migrate import Migrate

def create_app(config=None):
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "secret!"
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    if config:
        if isinstance(config, dict):
            app.config.update(config)   # handles dicts
        else:
            app.config.from_object(config)
        
    # attach socket, login manager and database to server.
    
    login_manager.init_app(app)
    login_manager.login_view = ""

    db.init_app(app)
    migrate = Migrate(app,db)
    migrate.init_app(app)
    socketio.init_app(app)
    # register relevant blueprints for the game
    app.register_blueprint(main)
    app.register_blueprint(shop)

    import models
    import shop_sockets
    import user_handling
    import sockets
    import dungeon_sockets


    return app
if __name__ == "__main__":
    app = create_app()
    socketio.run(app, debug=True)
    
