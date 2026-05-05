//THINGS THIS SCRIPT HANDLES
//- CHAT BOX FUNCTIONALITY


const chatButton = document.getElementById('btn_send');
const chatInput = document.getElementById('input_send');
const chatBox = document.getElementById('chat-box');
const socket = io();

function socketRequest(eventName, data = {}) {
    return new Promise((resolve) => {
        socket.emit(eventName, data, (response) => {
            resolve(response || { success: false, error: "No response from server" });
        });
    });
}

//this checks when you click send, and displays your message, then resets the chat input, i duplicated it to test for the enter key
chatButton.addEventListener('click', function() {
    
    const data = {
        txt: chatInput.value
    }
    socket.emit('chatmsg', data);
    console.log("sent message: " + chatInput.value)
    chatInput.value = '';
    }
    
)

const chatPanel = document.getElementById("chatPanel");
const toggleBtn = document.getElementById("chatToggle");

toggleBtn.addEventListener("click", () => {
  chatPanel.classList.toggle("show");
});

// boring networking stuff
socket.on('chatmsg', function(msg) {
    newmsgdiv = renderMessage(msg);
    displayMessage(newmsgdiv);
})

function renderMessage(msg) {
    const div = document.createElement("div");

    if (msg.type === "system") {
        div.className = "text-danger fst-italic";
        div.textContent = msg.text;
    }

    else if (msg.type === "pm") {
        div.className = "text-muted fst-italic";

        if (msg.from === CURRENT_USER) {
            div.textContent = `To ${msg.to}: ${msg.text}`;
        } else {
            div.textContent = `From ${msg.from}: ${msg.text}`;
        }
    }

    else {
        div.textContent = `${msg.from}: ${msg.text}`;
    }

    return div;
}

function displayMessage(msgdiv)
{      
    chatBox.appendChild(msgdiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function getChatHistory()
{
    chatBox.innerHTML = "";
    console.log("attempting to get chat history");
    chats = await socketRequest("get_my_chat_history");
    console.log(chats);
    chats.forEach(msg => {
        newmsgdiv = renderMessage(msg);
        console.log(newmsgdiv.textContent);
        displayMessage(newmsgdiv);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    getChatHistory();
});



