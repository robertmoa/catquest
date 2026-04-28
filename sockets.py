from flask_socketio import emit
from serverstuff import socketio, users
from flask import request

#handles chat messages including whispering
@socketio.on('chatmsg')
def handle_chatmsg(msg):
    #gets username from request id
    username = users.get(request.sid)
    #prints message -- CHANGE TO USERNAME WHEN LOGIN STUFF FINISHED
    print(f"Received message from {msg['userid']}: {msg['txt']}")
    #sets style to empty, so that a normal message will be non specific
    msg['style'] = ''

    
    #case 1, empty message, do not emit
    if msg['txt'] == '':
        print("empty message, not broadcasting")
        return
    

    #case 2 whisper
    if msg['txt'].startswith('/w '):
        message = msg['txt'][3:].split(' ')
        target_user = message[0]
        if target_user not in users.values():
            feedbackmsg = {
            'userid': 'CatQuest',
            'txt': "Player not found, make sure you have the correct username and that they are online.",
            'style': 'text-danger fst-italic'
            }
            emit('chatmsg', feedbackmsg, room=msg['userid'])
            return
            
        msg['txt'] = ' '.join(message[1:])
        msg['style'] = 'text-muted fst-italic'

        feedbackmsg = msg.copy()
        feedbackmsg['userid'] = f"to {target_user}"
        emit('chatmsg', msg, room=target_user)
        emit('chatmsg', feedbackmsg, room=msg['userid'])
        return
    

    #regular message
    else:
        emit('chatmsg', msg, broadcast=True)
