const p_sprite = document.getElementById("playersprite")
const pressedKeys = new Set();
vel = 2;

class vector{
    costructor(x,y){
        this.x = x;
        this.y = y;
    }
}
class cat{
    constructor(x,y,img,username){
        this.x = x
        this.y = y
        this.img = img
        this.username = username
    }
    velocity = new vector(0,0);
}
document.addEventListener('keydown', (event) => {
        pressedKeys.add(event.code); // Use event.code for consistency
    });
document.addEventListener('keyup', (event) => {
        pressedKeys.delete(event.code);
    });
var screen = {
    canvas : document.getElementById("gamecanvas"),
    start : function() {
        this.ctx = this.canvas.getContext("2d");

        this.interval = setInterval(updatescreen, 20);
        },
    clear : function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

;
function startgame()
{


    screen.start();
    mycat = new cat(screen.canvas.width/2,screen.canvas.height/2,p_sprite,"mycat");
}
function drawplayer(thiscat)
{
    screen.ctx.drawImage(thiscat.img,thiscat.x,thiscat.y);
    screen.ctx.fillText(thiscat.username,thiscat.x,thiscat.y-20);
}

function updatescreen(){
    screen.clear();
    drawplayer(mycat);
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









