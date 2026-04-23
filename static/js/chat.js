//THINGS THIS SCRIPT HANDLES
//- CHAT BOX FUNCTIONALITY



const chatButton = document.getElementById('btn_send');
const chatInput = document.getElementById('input_send');
const chatBox = document.getElementById('chat_box')
//this checks when you click send, and displays your message, then resets the chat input, i duplicated it to test for the enter key
chatButton.addEventListener('click', function() {
    if(chatInput.value == "/h")
    {
        displayMessageStyled("CatQuest","Use /w to whisper messages, and the W/A/S/D Keys to move around, check out the shop for the latest items!","text-info fst-italic")
    }
    else if (chatInput.value.slice(0,3) == "/w ")
    {
        displayMessageStyled(mycat.username,chatInput.value.slice(3),"text-secondary fst-italic")

    }
    else
    {
        displayMessage(mycat.username,chatInput.value)
    }
    chatInput.value = ''
    }
)


function displayMessage(userid,txt)
{
    if (txt == '') return "no text!"
    chatBox.innerHTML+= `(${userid}): ${txt}<br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}
function displayMessageStyled(userid,txt,bsstyle)
{
    if (txt == '') return "no text!"
    chatBox.innerHTML+= `<span class="${bsstyle}">(${userid}): ${txt}</span><br>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}


displayMessageStyled("CatQuest","Welcome to CatQuest!, use /h for help","text-info fst-italic")