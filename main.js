
// FULL FIX: procedural canvas background (no assets)

const intro = document.getElementById('intro');
const game = document.getElementById('game');
const startBtn = document.getElementById('startBtn');
const canvas = document.getElementById('towerCanvas');
const ctx = canvas.getContext('2d');

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);

let scrollY = 0;
const TILE = 80;

// generate random wall pattern once
let wallRows = [];
function generateWalls(){
  wallRows = [];
  const rows = Math.ceil(canvas.height / TILE) + 2;
  for(let i=0;i<rows;i++){
    wallRows.push({
      left: Math.random(),
      right: Math.random()
    });
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const rows = wallRows.length;

  // walls
  wallRows.forEach((row,i)=>{
    const y = i*TILE;
    ctx.fillStyle = `rgb(${60+row.left*80},60,80)`;
    ctx.fillRect(0,y,TILE*2,TILE);
    ctx.fillStyle = `rgb(${60+row.right*80},60,80)`;
    ctx.fillRect(canvas.width-TILE*2,y,TILE*2,TILE);
  });

  // stairs
  ctx.fillStyle = '#aaa';
  for(let i=0;i<rows;i++){
    const y = (i*TILE + scrollY) % (rows*TILE) - TILE;
    ctx.fillRect(canvas.width/2-TILE/2, y, TILE, TILE);
  }
}

function loop(){
  scrollY += 1.5;
  draw();
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', ()=>{
  intro.classList.add('hidden');
  game.classList.remove('hidden');
  resize();
  generateWalls();
  loop();
});
