Client: first for loop (client.js)

for (var i = -1; i <=1;i++){
  for (var j = -16; j <= 10; j++){
    for(var k = -15; k <=15; k++){

-----------------------------------------

Client: second for loop (client.js)

for (var i = -1; i <=1;i++){
  for (var j = 10; j <= 20; j++){
    for(var k = -15; k <=15; k++){

-----------------------------------------
Server: Minimize
if (-1 <= x && x<= 1 && -16 < z && z < 16 && y >= -17 && y <= 20) return 4
    if (-32 < x && x < 32 && -16 < z && z < 16 && y > -17 && y < 0) return 1
    if (-32 < x && x < 32 && -16 < z && z < 16 && y == -17) return 4
    if (x==32 && z >= -32 && z<32 && y >= -17 && y <=5) return 4
    if (x==-32 && z >= -32 && z<32 && y >= -17 && y <=5) return 4
    if (z==16 && x >= -32 && x<32 && y >= -17 && y <=5) return 4
    if (z==-16 && x >= -32 && x<32 && y >= -17 && y <=5) return 4

------------------------------------------

Server: Random

function random(n){
  return Math.floor.(Math.random() * n)
}

var game = engine(settings)
game.setBlock({x: 25 * (random(29) + 2), y:1, z: 25 * (random(31) - 15)}, 5) //places blueflag
game.setBlock({x: 25 * (-random(29) - 2), y:1, z: 25 * (random(31) - 15)}, 6)  //places redflag
var startingPosition = {
  "blueTeam" : {x:500,y:1000,z:500}, 
  "redTeam" : {x:-500,y:1000,z:500}
}