const express = require("express");
const app = express();
const http = require("http");
const serverless = require("serverless-http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const cors = require("cors");
const corsOptions = {
  origin: "*", // Replace with your frontend's URL
  allowedHeaders: ["*"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
const io = new Server(server, {
  cors: corsOptions,
});
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.json({ message: "Hello from chirag" });
});

// const GAMEBOARD_FOR_O = [0, 0, 0, 0, 0, 0, 0, 0, 0];
// const GAMEBOARD_FOR_X = [0, 0, 0, 0, 0, 0, 0, 0, 0];

const MAX_CLIENTS_PER_ROOM = 2;
let roomClients = {};
const symbols = ["O", "X"];
var symbol_assigning_index = 0;

const check_particular_array = (a, index) => {
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
};
function checkWinner(roomId, symbol, index) {
  if (symbol === "X") {
    return check_particular_array(roomClients[roomId].GAMEBOARD_FOR_X, index);
  } else {
    return check_particular_array(roomClients[roomId].GAMEBOARD_FOR_O, index);
  }
}
function sendSymbolToNewJoiningClient(socket) {
  var symbol = symbols[symbol_assigning_index];
  console.log(symbol);
  symbol_assigning_index = (symbol_assigning_index + 1) % 2;
  socket.emit("your_symbol", symbol);
}
io.on("connection", (socket) => {
  console.log(`A new user connected with id: ${socket.id}`);
  socket.on("join_room", async (room) => {
    if (!roomClients[room]) {
      //handle when there are no clients joined for particular room id
      roomClients[room] = {};
      roomClients[room].client_id = []; //it will create room with empty clients
      roomClients[room].GAMEBOARD_FOR_O = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      roomClients[room].GAMEBOARD_FOR_X = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    if (roomClients[room].client_id.length < MAX_CLIENTS_PER_ROOM) {
      socket.join(room); //adding the user to particular room
      roomClients[room].client_id.push(socket.id);
      console.log(`User ${socket.id} joined room ${room}`);
      sendSymbolToNewJoiningClient(socket);
      if (roomClients[room].client_id.length === 2) {
        console.log("two ids in the room");
        var initial_turn_id =
          roomClients[room].client_id[Math.floor(Math.random() * 2)];
        console.log(`Room no: ${room}`);
        await io.to(room).emit("start_game", initial_turn_id);
      }
    } else {
      console.log(`Room ${room} is full`);
      socket.emit("room_full");
      socket.disconnect();
    }
  });
  socket.on("player_move", async (data) => {
    if (data.symbol === "X") {
      roomClients[data.roomID].GAMEBOARD_FOR_X[data.index] = 1;
      // GAMEBOARD_FOR_X[data.info.index] = 1;
    } else {
      roomClients[data.roomID].GAMEBOARD_FOR_O[data.index] = 1;
      // GAMEBOARD_FOR_O[data.info.index] = 1;
    }
    if (checkWinner(data.roomID, data.symbol, data.index)) {
      await io.to(data.roomID).emit("game_over", data.socket_id);
      socket.disconnect();
      return;
    }
    socket.to(data.roomID).emit("player_turn", data);
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
    var roomId = Object.keys(roomClients).find((room) => {
      return roomClients[room].client_id.includes(socket.id);
    });
    if (!roomId) {
      return;
    }
    roomClients[roomId].client_id = roomClients[roomId].client_id.filter(
      (id) => id !== socket.id
    );
    roomClients[roomId].GAMEBOARD_FOR_O.splice(0, 9);
    roomClients[roomId].GAMEBOARD_FOR_X.splice(0, 9);
    roomClients[roomId].client_id = [];
    console.log("roomClients : ", roomClients);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("server is listening on port: " + PORT);
});

module.exports = app;
