var simplex = require('voxel-simplex-terrain')
var seed = "hello"
window.generator = simplex({seed: seed, scaleFactor: 10, chunkDistance: 1})
var createGame = require('voxel-engine')
var TIMEOUT = 10000

var game = createGame({
    generate: function(x, y, z) {
    //if (x== 1 && y==0 && z == 0) return 1
    if (-1 <= x && x<=1 && -32 < z && z < 32 && y >= -33 && y <= 100) return 4
    if (-64 < x && x < 64 && -32 < z && z < 32 && y > -33 && y < 0) return 1
    if (-64 < x && x < 64 && -32 < z && z < 32 && y == -33) return 4
    if (x==63 && z >= -32 && z<32 && y >= 0 && y <=5) return 4
    if (x==-63 && z >= -32 && z<32 && y >= 0 && y <=5) return 4
    if (z==32 && x >= -64 && x<64 && y >= 0 && y <=5) return 4
    if (z==-32 && x >= -64 && x<64 && y >= 0 && y <=5) return 4

    return 0
  },
  chunkDistance: 1,
 

  startingPosition: [0, 500, 0], // x, y, z
  materials: [['grass', 'dirt', 'grass_dirt'], 'brick', 'dirt', 'obsidian', 'bedrock']
})
function changeToGrass(){
for (var i = -1; i <=1;i++){
  for (var j = -32; j <= 3; j++){
    for(var k = -31; k <=31; k++){
      
      var position = {x:i*25, y:j*25, z:k*25}
      { game.setBlock(position,1)}
           //else {game.setBlock(position,1)}
      }
    }
  }
  
  for (var i = -1; i <=1;i++){
  for (var j = 4; j <= 20; j++){
    for(var k = -31; k <=31; k++){
      
      var position = {x:i*25, y:j*25, z:k*25}
      { game.setBlock(position,0)}
      }
    }
  }
}




// rotate camera to look straight down
game.controls.pitchObject.rotation.x = -1.5

var container = document.body
game.appendTo(container)
// have the game take over your mouse pointer when you click on it
game.setupPointerLock(container)
setTimeout( function(){
for (var i = -1; i <=1;i++){
  for (var j = -32; j <= 3; j++){
    for(var k = -31; k <=31; k++){
      
      var position = {x:i*25, y:j*25, z:k*25}
      { game.setBlock(position,1)}
           //else {game.setBlock(position,1)}
      }
    }
  }
  
  for (var i = -1; i <=1;i++){
  for (var j = 4; j <= 20; j++){
    for(var k = -31; k <=31; k++){
      
      var position = {x:i*25, y:j*25, z:k*25}
      { game.setBlock(position,0)}
      }
    }
  }
}, TIMEOUT)
