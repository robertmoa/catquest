from flask_socketio import emit, join_room, leave_room, disconnect
from flask import request
from serverstuff import socketio, users
#gets the users dictionary from serverstuff




    

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