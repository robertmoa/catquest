from serverstuff import db

class User(db.Model):
    __tablename__ = 'Users'
    idnum = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20),unique =True, nullable=False)
    password = db.Column(db.String(200),nullable=False)
