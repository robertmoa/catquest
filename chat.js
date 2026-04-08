//THINGS THIS SCRIPT HANDLES
//- CHAT BOX FUNCTIONALITY



const chatButton = document.getElementById('btn_send');
const chatInput = document.getElementById('input_send');
const chatBox = document.getElementById('chat_box')
//this checks when you click send, and displays your message, then resets the chat input, i duplicated it to test for the enter key
chatButton.addEventListener('click', function() {
    displayMessage(mycat.username,chatInput.value)
    chatInput.value = ''
})


function displayMessage(userid,txt)
{
    if (txt == '') return "no text!"
    if (txt.slice(0,3) == "/w ")
    {
        chatBox.innerHTML+= `<span class="text-secondary fst-italic">(${userid}): ${txt.slice(3)}</span><br>`;
    }
    else
    {
        chatBox.innerHTML+= `(${userid}): ${txt}<br>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}