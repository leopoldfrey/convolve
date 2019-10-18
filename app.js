var express     	= require("express");
var http        	= require("http");
var serveIndex  	= require("serve-index");
var WebSocket   	= require("ws");
var WebSocketServer	= WebSocket.Server;
var app         	= express();
var server 			= http.createServer(app);
var fs 				= require('fs');
	
var filesJson;

function listSoundFiles() {
	fs.readdir('public/sounds/', (err, list) => {
	  	filesJson = JSON.stringify(list.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item)));
	});
}

/* ------------ PARAMETERS --------- */

// use alternate localhost and the port Heroku assigns to $PORT
const port = process.env.PORT || 3000;

app.get('/',function(req,res){
    res.sendFile(__dirname + "/public/index.html");
});

app.get('/index.html',function(req,res){
      res.sendFile(__dirname + "/public/index.html");
});

/*----------- Static Files -----------*/
app.use('/js', express.static('public/js'));
app.use('/js/visualizer', express.static('public/js/visualizer'));
app.use('/shaders', express.static('public/shaders'));
app.use('/sounds', express.static('public/sounds'));
app.use('/sounds', serveIndex('public/sounds'));
app.use('/shaders', serveIndex('public/shaders'));
app.use('/js', serveIndex('public/js'));
app.use('/js/visualizer', serveIndex('public/js/visualizer'));

listSoundFiles();

server.listen(port,function() {
    console.log("| Web Server listening port " + port);
});

// express nodejs

app.use(function(err, req, res, next) {
  // Do logging and user-friendly error message display
  console.error(err);
  res.status(500).send('internal server error');
})

app.post('/getSounds', function (req, res) {
	console.log('/getSounds');
	res.end(filesJson);
})

app.post('/updateSounds', function (req, res) {
	console.log('/updateSounds');
	listSoundFiles();
	res.end("ok");
})

/*----------- WS Server -----------*/
/*
const wss = new WebSocketServer({
    server: server,
    autoAcceptConnections: true
});

wss.closeTimeout = 180 * 1000;

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    //console.log('| WebSocket received : %s', message);

    var input = JSON.parse(message);
    
    switch(input.command) {
      case "newController":
        id = newId();
        //console.log("New Controller ["+id+"]");
        ws.send(
          JSON.stringify({
            charset : 'utf8mb4', 
            command: "id",
            id: id
        }));
        break;
      case "newUser":
        id = newId();
        //console.log("New User ["+id+"]");
        ws.send(
          JSON.stringify({
            charset : 'utf8mb4', 
            command: "id",
            id: id
        }));
        break;
      case "clear":
        //console.log("TODO Clear");
        if(wss)
        {
          wss.clients.forEach(function each(client) {
            client.send(
              JSON.stringify(
              {
                charset : 'utf8mb4', 
                command: "clear"
              }));
          });
        }
        break;
    }
  });
});//*/