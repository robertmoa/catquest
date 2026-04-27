from flask_socketio import emit, join_room, leave_room, disconnect
from flask import request
from serverstuff import socketio, users
#gets the users dictionary from serverstuff


@socketio.on('connectmsg')
def handle_connectmsg(connectmsg):
    print(connectmsg['data'] + ' has connected, adding them to users and putting them in their room...')

    users[request.sid] = connectmsg['data']
    print(users)
    join_room(connectmsg['data'])

    data = {
        'userid': 'CatQuest',
        'txt': f"{connectmsg['data']} has joined"
    }
    emit('chatmsg', data, broadcast=True)
    

@socketio.on('disconnect')
def handle_disconnect():

    data = {
        'userid': 'CatQuest',
        'txt': f"{users.get(request.sid, 'Unknown user')} has left"
    }
    emit('chatmsg', data, broadcast=True)

    print(f"{request.sid} has disconnected, removing them from users...")
    #finally remove the user from the dictionary
    users.pop(request.sid, None)
    print(users)