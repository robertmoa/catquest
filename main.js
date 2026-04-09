//      THINGS THIS SCRIPT HANDLES:
//      -   MOVEMENT
//      -   DRAWING OF THE SCREEN



//this sets up the ability to check for certain keypresses (wasd etc)
const pressedKeys = new Set();
document.addEventListener('keydown', (event) => {
        pressedKeys.add(event.code); // Use event.code for consistency
    });
document.addEventListener('keyup', (event) => {
        pressedKeys.delete(event.code);
    });

// gets the player sprite so it can be drawn
const p_sprite = document.getElementById("playersprite")
// sets up the velocity variable
vel = 3;


//creates vectors we can use (very useful for 2d games)
class vector{
    costructor(x,y){
        this.x = x;
        this.y = y;
    }
}

//cat class! contains its position, image it should use, and its username
class cat{
    constructor(x,y,img,username){
        this.x = x
        this.y = y
        this.img = img
        this.username = username
    }
    velocity = new vector(0,0);
}


var screen = {
    canvas : document.getElementById("gamecanvas"),
    start : function() {
        this.ctx = this.canvas.getContext("2d");
        this.interval = setInterval(updatescreen, 20);
        this.interval = setInterval(updategamestate, 20);
        this.canvas.height = this.canvas.parentElement.offsetHeight;
        this.canvas.width = this.canvas.parentElement.offsetWidth;
        },
    clear : function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

;
function startgame()
{
    screen.start();
    screen.ctx.imageSmoothingEnabled = false;
    screen.ctx.font = '16px Minecraft'
    mycat = new cat(screen.canvas.width/2,screen.canvas.height/2,p_sprite,"mycat");
}
function drawplayer(thiscat)
{
    screen.ctx.textAlign = "center";
    screen.ctx.drawImage(thiscat.img,thiscat.x,thiscat.y,64,64);
    screen.ctx.fillText(thiscat.username,thiscat.x+32,thiscat.y-8);
}

function updatescreen(){
    screen.clear();
    drawplayer(mycat);
}
function updategamestate(){
    if (document.activeElement != chatInput)
    {
        if (pressedKeys.has('KeyW')){
        mycat.y -=vel
        }
        if (pressedKeys.has('KeyS')){
            mycat.y += vel
        }
        if (pressedKeys.has('KeyA')){
            mycat.x -=vel
        }
        if (pressedKeys.has('KeyD')){
            mycat.x +=vel
        }
    }
}









