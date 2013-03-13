var url = require('url')
var websocket = require('websocket-stream')
var engine = require('voxel-engine')
var duplexEmitter = require('duplex-emitter')
var toolbar = require('toolbar')
var randomName = require('./randomname')
var crunch = require('voxel-crunch')
var emitChat = require('./chat')
var blockSelector = toolbar({el: '#tools'})
var highlight = require('voxel-highlight')
var skin = require('minecraft-skin')
var player = require('voxel-player')
var emitter, playerID
var players = {}, lastProcessedSeq = 0
var localInputs = [], connected = false, erase = true
var currentMaterial = 1
var lerpPercent = 0.1
var showPlayer
var team
var TIMEOUT = 120000
var counter=0
var lifted=0
window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 'X'.charCodeAt(0)) erase = !erase
})
function ctrlToggle (ev) { erase = !ev.ctrlKey }
window.addEventListener('keyup', ctrlToggle)
window.addEventListener('keydown', ctrlToggle)

var socket = websocket('ws://' + url.parse(window.location.href).host)
socket.on('end', function() { connected = false })
connectToGameServer(socket)


function connectToGameServer(socket) {

  emitter = duplexEmitter(socket)
  connected = true

  emitter.on('id', function(id) {
    playerID = id
  })
  emitter.on('team', function(t){
    team=t
  })
  emitter.on('settings', function(settings) {
    settings.generateChunks = false
    window.game = game = createGame(settings)
    console.log(settings)
    emitter.emit('created')
    var numChunks
    var received = 0
    emitter.on('chunkCount', function(count) {
      numChunks = count
    })
    emitter.on('chunk', function(encoded, chunk) {
      var voxels = crunch.decode(encoded, chunk.length)
      chunk.voxels = voxels
      game.showChunk(chunk)
      received++
      if (numChunks) {
        if (received === numChunks) showPlayer()
      }
    })
  })

  // fires when server sends us voxel edits
  emitter.on('set', function(pos, val) {
    game.setBlock(pos, val)
  })
}
var viking //moved viking
function createGame(options) {
  options.controlsDisabled = false
  window.game = engine(options)
  //var viking
  function sendState() {
    if (!connected || !viking) return
    var state = {
      position: viking.yaw.position,
      rotation: {
        y: viking.yaw.rotation.y,
        x: viking.pitch.rotation.x
      }
    }
    emitter.emit('state', state)
  }
    
  var name = localStorage.getItem('name')
  if (!name) {
    name = randomName()
    localStorage.setItem('name', name)
  }

/*  emitter.on('wins', function(team){
    var tit= document.createElement('h1')
    if(team==blueTeam){
    tit.innerHTML='BLUE TEAM VICTORY'}
    if(team==redTeam){tit.innerHTML='RED TEAM VICTORY'}
    var body=document.getElementById('win')
    body.appendChild(tit)
  })*/
  emitChat(name, emitter, team)

  var container = document.querySelector('#container')
  game.appendTo(container)
  // rescue(game)
  showPlayer = function() {  //showPlayer already defined in global scope
    var createPlayer = player(game)
    console.log('team!', team)
    if (team === "blueTeam") viking = createPlayer('blueSkin.png')
    if (team === "redTeam") viking = createPlayer('redSkin.png')
    viking.moveTo(options.startingPosition)
    viking.possess()
    game.controls.on('data', function(state) {
      var interacting = false
      Object.keys(state).map(function(control) {
        if (state[control] > 0) interacting = true
      })
      if (interacting) sendState()
    })
  }

  highlight(game)
  
  blockSelector.on('select', function(material) {
    currentMaterial = +material
  })

  game.on('fire', function (target, state) {  //emits set whenever you click: if click on obsidian block, don't do anything if it is(server has obsidian wall hardcoded)
    var vec = game.cameraVector()
    var pos = game.cameraPosition()
    var point = game.raycast(pos, vec, 100)
    if (!point) return
    var erase = !state.firealt && !state.alt
    var size = game.cubeSize
    counter++
    var tit= document.createElement('h1')
    tit.innerHTML=counter
    var body=document.getElementById('win')
    body.appendChild(tit)
    setTimeout(function(){body.removeChild(document.getElementsByTagName("h1")[0])}, 100)
    if (game.getBlock(point)==4||game.getBlock(point)==5||game.getBlock(point)==6){
      if(game.getBlock(point)==5 && team=="redTeam"){
        console.log("VICTORY")
        emitter.emit('message', {user:'ADMIN', text:'RED TEAM VICTORY', tc:0})
        emitter.emit('set', {x: point.x, y: point.y, z: point.z}, 0)
        var tit= document.createElement('h1')
        tit.innerHTML='RED TEAM VICTORY'
        var body=document.getElementById('win')
        body.appendChild(tit)
        // emitter.emit('winner', team)
        
      }
      if(game.getBlock(point)==6 && team=="blueTeam"){
        console.log("VICTORY")
        emitter.emit('message', {user:'ADMIN', text:'BLUE TEAM VICTORY', tc:0})
        emitter.emit('set', {x: point.x, y: point.y, z: point.z}, 0)
        var tit= document.createElement('h1')
        tit.innerHTML='BLUE TEAM VICTORY'
        var body=document.getElementById('win')
        body.appendChild(tit)
        // emitter.emit('winner', team)
      }
      else{
            return}
    }
    if (erase) {
      emitter.emit('set', {x: point.x, y: point.y, z: point.z}, 0)
    } else {
      var newBlock = game.checkBlock(point)
      if (!newBlock) return
      var direction = game.camera.matrixWorld.multiplyVector3(new game.THREE.Vector3(0,0,-1))
      var diff = direction.subSelf(game.controls.target().yaw.position.clone()).normalize()
      diff.multiplySelf({ x: 1, y: 1, z: 1 })
      var p = point.clone().addSelf(diff)
      emitter.emit('set', p, currentMaterial)
    }
  })
  // setTimeout is because three.js seems to throw errors if you add stuff too soon
  setTimeout(function() {
    emitter.on('update', function(updates) {      
      Object.keys(updates.positions).map(function(player) {
        var update = updates.positions[player]
        if (player === playerID) return onServerUpdate(update) // local player
        updatePlayerPosition(player, update) // other players
      })
    })
  }, 1000)



  emitter.on('leave', function(id) {
    if (!players[id]) return
    game.scene.remove(players[id].mesh)
    delete players[id]
  })
  
  return game
}

setTimeout( function(){
  if(lifted==0){
  for (var i = -1; i <=1;i++){
    for (var j = -16; j <= 10; j++){
      for(var k = -15; k <=15; k++){
        
        var position = {x:i*25, y:j*25, z:k*25}
        emitter.emit('set', position, 1)
        }
      }
    }
    
  for (var i = -1; i <=1;i++){
    for (var j = 10; j <= 20; j++){
      for(var k = -15; k <=15; k++){
        
        var position = {x:i*25, y:j*25, z:k*25}
        emitter.emit('set', position, 0)
        }
      }
    }
      var tit= document.createElement('h1')
        tit.innerHTML='THE WALL HAS BEEN LIFTED'
        var body=document.getElementById('win')
        body.appendChild(tit)
        setTimeout(function(){body.removeChild(document.getElementsByTagName("h1")[0])}, 1000)
        lifted+=1
  }

}, TIMEOUT)


function onServerUpdate(update) {
  //var pos = game.controls.target().yaw.position
  //var distance = pos.distanceTo(update.position)
  // todo use server sent location
}
function lerpMe(position) {
  var to = new game.THREE.Vector3()
  to.copy(position)
  var from = game.controls.target().yaw.position
  from.copy(from.lerpSelf(to, lerpPercent))  
}

function updatePlayerPosition(id, update) {
  var pos = update.position
  var player = players[id]
  if (!player) {
    if (update.team === "blueTeam") playerSkin = skin(game.THREE, 'blueSkin.png')
    if (update.team === "redTeam") playerSkin = skin(game.THREE, 'redSkin.png')
    var playerMesh = playerSkin.mesh
    players[id] = playerSkin
    playerMesh.children[0].position.y = 10
    game.scene.add(playerMesh)
  }
  var playerSkin = window.playerSkin = players[id]
  var playerMesh = playerSkin.mesh.children[0]
  playerMesh.position.copy(pos, lerpPercent)
  
  var to = new game.THREE.Vector3()
  to.copy(pos)
  var from = playerMesh.position
  from.copy(from.lerpSelf(to, lerpPercent))  
  
  playerMesh.position.y += 17
  playerMesh.rotation.y = update.rotation.y + (Math.PI / 2)
  playerSkin.head.rotation.z = scale(update.rotation.x, -1.5, 1.5, -0.75, 0.75)
}

function scale( x, fromLow, fromHigh, toLow, toHigh ) {
  return ( x - fromLow ) * ( toHigh - toLow ) / ( fromHigh - fromLow ) + toLow
}
