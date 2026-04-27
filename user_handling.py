from werkzeug.security import check_password_hash, generate_password_hash
from serverstuff import socketio,db,users
from models import User
from flask_socketio import emit
from flask import request

@socketio.on("new_user")
def create_user(new_user):
    user = User.query.filter_by(username=new_user['username']).first()
    #this tells us that no user by that name is in User table, thus create it
    if user == None:
        pw_hashed = generate_password_hash(new_user['password'])
        username = new_user['username']
        new_user_entry = User(username=username,password=pw_hashed)
        db.session.add(new_user_entry)
        db.session.commit()
        emit('new_user_added')
        #tells client this user already exists.
    else:
        emit('user_exists')

@socketio.on("login")
def login(login):
    username = login['username']
    password = login['password']
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password,password) == True:
        users[request.sid] = user.id
        
        #when user logs in, as it will take them to the main chat page, send a connection message.

        data = {
        'userid': 'CatQuest',
        'txt': f"{users.get(request.sid)} has joined"
        }
        emit('chatmsg', data, broadcast=True)

        #then emit login success to inform client
        emit('login_success')
    else:
        #if this failed, you did not get the correct password
        emit('login_failure')

