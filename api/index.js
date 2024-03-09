const express = require("express");
const app = express();
const http = require("http");
const serverless = require("serverless-http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const cors = require("cors");
const corsOptions = {
  origin: "*", // Replace with your frontend's URL
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
const io = new Server(server, {
  cors: corsOptions,
});
app.use(cors(corsOptions));
const GAMEBOARD_FOR_O = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const GAMEBOARD_FOR_X = [0, 0, 0, 0, 0, 0, 0, 0, 0];

const MAX_CLIENTS_PER_ROOM = 2;
let roomClients = {};
const symbols = ["O", "X"];
var symbol_assigning_index = 0;

function check_particular_array(a, index) {
  switch (index) {
    case 0:
      return (a[1] && a[2]) || (a[3] && a[6]) || (a[4] && a[8]); //returns true if any case is true, that is player is winner
    case 1:
      return (a[0] && a[2]) || (a[4] && a[7]);
    case 2:
      return (a[0] && a[1]) || (a[5] && a[8]) || (a[4] && a[6]);
    case 3:
      return (a[0] && a[6]) || (a[4] && a[5]);
    case 4:
      return (
        (a[0] && a[8]) || (a[2] && a[6]) || (a[1] && a[7]) || (a[3] && a[5])
      );
    case 5:
      return (a[2] && a[8]) || (a[3] && a[4]);
    case 6:
      return (a[0] && a[3]) || (a[2] && a[4]) || (a[8] && a[7]);
    case 7:
      return (a[1] && a[4]) || (a[6] && a[8]);
    case 8:
      return (a[2] && a[5]) || (a[6] && a[7]) || (a[0] && a[4]);
  }
  return false;
}
function checkWinner(symbol, index, socket_id) {
  if (symbol === "X") {
    return check_particular_array(GAMEBOARD_FOR_X, index);
  } else {
    return check_particular_array(GAMEBOARD_FOR_O, index);
  }
}

io.on("connection", (socket) => {
  console.log(`A new user connected with id: ${socket.id}`);
  socket.on("join_room", (room) => {
    if (!roomClients[room]) {
      //handle when there are no clients joined for particular room id
      roomClients[room] = []; //it will create room with empty clients
    }
    if (roomClients[room].length < MAX_CLIENTS_PER_ROOM) {
      socket.join(room); //adding the user to particular room
      roomClients[room].push(socket.id); //adding the user id to room

      console.log(`User ${socket.id} joined room ${room}`);
      var symbol = symbols[symbol_assigning_index];
      console.log(symbol);
      symbol_assigning_index = (symbol_assigning_index + 1) % 2;
      socket.emit("your_symbol", symbol);
    } else {
      socket.emit("room_full");
      socket.disconnect();
      console.log(`Room ${room} is full`);
    }
  });

  // socket.on("send_message", (data) => {
  //   var symbol = symbols[symbol_assigning_index];
  //   console.log(symbol);
  //   symbol_assigning_index = (symbol_assigning_index + 1) % 2;
  //   socket.emit("your_symbol", symbol);
  //   console.log(data);
  // });
  socket.on("player_move", async (data) => {
    console.log("player_move");
    console.log(data.info.index);
    if (data.info.symbol === "X") {
      GAMEBOARD_FOR_X[data.info.index] = 1;
    } else {
      GAMEBOARD_FOR_O[data.info.index] = 1;
    }
    // io.to(roomClients[data.roomID]).emit("player_turn", data.info);
    socket.to(data.roomID).emit("player_turn", data.info);
    if (checkWinner(data.info.symbol, data.info.index, data.info.socket_id)) {
      //if player with socket id= socket_id wins
      await io.to(data.roomID).emit("game_over", data.info.socket_id);
      socket.disconnect();
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
    GAMEBOARD_FOR_O.splice(0, GAMEBOARD_FOR_O.length);
    GAMEBOARD_FOR_X.splice(0, GAMEBOARD_FOR_X.length);
    console.log("GAMEBOARD_FOR_O : ", GAMEBOARD_FOR_O);
    console.log("GAMEBOARD_FOR_X : ", GAMEBOARD_FOR_X);
    roomClients = {};
    console.log("roomClients : ", roomClients);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log("server is listening on port: " + PORT);
});

module.exports = app;
