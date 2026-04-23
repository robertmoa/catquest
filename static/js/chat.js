//THINGS THIS SCRIPT HANDLES
//- CHAT BOX FUNCTIONALITY


const chatButton = document.getElementById('btn_send');
const chatInput = document.getElementById('input_send');
const chatBox = document.getElementById('chat_box')
//this checks when you click send, and displays your message, then resets the chat input, i duplicated it to test for the enter key
chatButton.addEventListener('click', function() {
    
    const data = {
        userid: window.username,
        txt: chatInput.value
    }
    socket.emit('chatmsg', data);
    console.log("sent message: " + chatInput.value)
    chatInput.value = '';
    }
    
)

// boring networking stuff
socket.on('chatmsg', function(msg) {
    console.log ("new chat message!")
    displayMessage(msg.userid, msg.txt,msg.style);
})

function displayMessage(userid,txt,bsstyle="")
{
    if (txt == '') return "no text!";
    chatBox.innerHTML+= `<span class="${bsstyle}">(${userid}): ${txt}</span><br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}



