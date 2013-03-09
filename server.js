var http = require('http')
var ecstatic = require('ecstatic')
var WebSocketServer = require('ws').Server
var websocket = require('websocket-stream')
var duplexEmitter = require('duplex-emitter')
var path = require('path')
var uuid = require('hat')
var crunch = require('voxel-crunch')
var engine = require('voxel-engine')
var TIMEOUT= 10000

// these settings will be used to create an in-memory
// world on the server and will be sent to all
// new clients when they connect


var settings = {
  //startingPosition: {x: 500, y: 1000, z: 500},                                  //starting positionA and starting positionB

  materials: [['grass', 'dirt', 'grass_dirt'], 'brick', 'dirt', 'obsidian', 'blueflag', 'redflag'], 

  controlsDisabled: true,
  controls: { discreteFire: true },
  generate: function(x, y, z) {
    //if (x== 1 && y==0 && z == 0) return 1
    if (-1 <= x && x<= 1 && -16 < z && z < 16 && y >= -17 && y <= 20) return 4
    if (-32 < x && x < 32 && -16 < z && z < 16 && y > -17 && y < 0) return 1
    if (-32 < x && x < 32 && -16 < z && z < 16 && y == -17) return 4
    if (x==32 && z >= -16 && z<16 && y >= -17 && y <=5) return 4
    if (x==-32 && z >= -16 && z<16 && y >= -17 && y <=5) return 4
    if (z==16 && x >= -32 && x<32 && y >= -17 && y <=5) return 4
    if (z==-16 && x >= -32 && x<32 && y >= -17 && y <=5) return 4

    return 0
  }
}

function random(n){
  return Math.floor(Math.random() * n)
}

var game = engine(settings)
game.setBlock({x: 25 * (random(29) + 2), y:1, z: 25 * (random(31) - 15)}, 5) //places blueflag
game.setBlock({x: 25 * (-random(29) - 2), y:1, z: 25 * (random(31) - 15)}, 6)  //places redflag
var startingPosition = {
  "blueTeam" : {x:500/2,y:1000/2,z:500/2}, 
  "redTeam" : {x:-500/2,y:1000/2,z:500/2}
}
var server = http.createServer(ecstatic(path.join(__dirname, 'www')))
var wss = new WebSocketServer({server: server})
var clients = {}
var chunkCache = {}

// simple version of socket.io's sockets.emit
function broadcast(id, cmd, arg1, arg2, arg3) {   //loop thru client --> id.   
  Object.keys(clients).map(function(client) {
    if (client === id) return
    clients[client].emit(cmd, arg1, arg2, arg3)
  })
}

function teamCount(teamName) {
  var counter = 0
  Object.keys(clients).map(function(client) {
    var player = clients[client]
    if (player.team === teamName) counter++
  })
  return counter
}
function assignTeam(player) {  //takes in emitter
  var teamCountBlue = teamCount("blueTeam")
  var teamCountRed = teamCount("redTeam")
  if (teamCountBlue === 0) return player.team = "blueTeam"
  if (teamCountBlue >= teamCountRed) return player.team = "redTeam"
  if (teamCountBlue < teamCountRed) return player.team = "blueTeam"     
}
function sendUpdate() {
  var clientKeys = Object.keys(clients)
  if (clientKeys.length === 0) return
  var update = {positions:{}}
  clientKeys.map(function(key) {
    var emitter = clients[key]
    update.positions[key] = {
      position: emitter.player.position,
      rotation: {
        x: emitter.player.rotation.x,
        y: emitter.player.rotation.y
      }
    }
  })
  broadcast(false, 'update', update)
}


setInterval(sendUpdate, 1000/22) // 45ms

wss.on('connection', function(ws) {  //runs every time a new play connects, everything above this runs only when server sets up
  // turn 'raw' websocket into a stream
  var stream = websocket(ws)
  
  var emitter = duplexEmitter(stream)
  
  var id = uuid()
  clients[id] = emitter
  
  emitter.player = {
    rotation: new game.THREE.Vector3(),
    position: new game.THREE.Vector3()
  }
  team_assigned = assignTeam(emitter)  //assign team  (emitter.team)
  console.log(id, 'joined', team_assigned)
  emitter.emit('id', id)
  emitter.emit('team', team_assigned)
  broadcast(id, 'join', id)
  stream.once('end', leave)
  stream.once('error', leave)
  function leave() {
    delete clients[id]
    console.log(id, 'left')
    broadcast(id, 'leave', id)
  }
  
  emitter.on('message', function(message) {
    if (!message.text) return
    if (message.text.length > 140) message.text = message.text.substr(0, 140)
    if (message.text.length === 0) return
    console.log('chat', message)
    broadcast(null, 'message', message)
  })
  
  // give the user the initial game settings
  settings.startingPosition = startingPosition[emitter.team]
  //settings.team = emitter.team  //player's team is passed into settings COMMENTED OUT
  emitter.emit('settings', settings)
  
  // fires when the user tells us they are
  // ready for chunks to be sent
  emitter.on('created', function() {
    sendInitialChunks(emitter)
    // fires when client sends us new input state
    emitter.on('state', function(state) {
      emitter.player.rotation.x = state.rotation.x
      emitter.player.rotation.y = state.rotation.y
      var pos = emitter.player.position
      var distance = pos.distanceTo(state.position)
      if (distance > 20) {
        var before = pos.clone()
        pos.lerpSelf(state.position, 0.1)
        return
      }
      pos.copy(state.position)
    })
  })
  emitter.on('winner', function(team){broadcast(null,'wins', team)})
  emitter.on('set', function(pos, val) {
    game.setBlock(pos, val)
    var chunkPos = game.voxels.chunkAtPosition(pos)
    var chunkID = chunkPos.join('|')
    if (chunkCache[chunkID]) delete chunkCache[chunkID]
    broadcast(null, 'set', pos, val)
  })
  emitter.on('win', function(id, mat){
    console.log(emitter.team)
    if (clients[id].team=="blueTeam"){console.log("Blue win")}
    else{console.log("js why")}
  })
  
})

function sendInitialChunks(emitter) {
  emitter.emit("chunkCount", Object.keys(game.voxels.chunks).length)
  Object.keys(game.voxels.chunks).map(function(chunkID) {
    var chunk = game.voxels.chunks[chunkID]
    var encoded = chunkCache[chunkID]
    if (!encoded) {
      encoded = crunch.encode(chunk.voxels)
      chunkCache[chunkID] = encoded
    }
    emitter.emit('chunk', encoded, {
      position: chunk.position,
      dims: chunk.dims,
      length: chunk.voxels.length
    })
  })
}

var port = process.argv[2] || 8080
server.listen(port)
console.log('Listening on ', port, ' open http://localhost:', port)
