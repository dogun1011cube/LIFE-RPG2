
// RANDOM TOWER CANVAS SYSTEM (GitHub Pages OK)
const canvas = document.getElementById("towerCanvas");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const TILE = 128;
const sprite = new Image();
sprite.src = "assets/tower_tiles.png";

let wallRows = [];
let scrollY = 0;

const WALL_PARTS = [
  {x:0,y:0},{x:128,y:0},{x:256,y:0},{x:384,y:0}
];
const STAIRS = {x:512,y:256};

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function generateWalls(){
  wallRows = [];
  const rows = Math.ceil(canvas.height / TILE) + 2;
  for(let i=0;i<rows;i++){
    wallRows.push({ left: rand(WALL_PARTS), right: rand(WALL_PARTS) });
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  wallRows.forEach((row,i)=>{
    const y = i*TILE;
    ctx.drawImage(sprite,row.left.x,row.left.y,TILE,TILE,0,y,TILE,TILE);
    ctx.drawImage(sprite,row.right.x,row.right.y,TILE,TILE,canvas.width-TILE,y,TILE,TILE);
  });
  const rows = Math.ceil(canvas.height / TILE) + 2;
  for(let i=0;i<rows;i++){
    const y = (i*TILE + scrollY) % (rows*TILE) - TILE;
    ctx.drawImage(sprite,STAIRS.x,STAIRS.y,TILE,TILE,canvas.width/2-TILE/2,y,TILE,TILE);
  }
}

function loop(){
  scrollY += 1.5;
  draw();
  requestAnimationFrame(loop);
}

sprite.onload = ()=>{ generateWalls(); loop(); };
