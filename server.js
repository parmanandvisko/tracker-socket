const express = require("express");
var db = require('./src/config/dbconnect');
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");


const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const users = {}; // username: socketId

io.on("connection", (socket) => {
    console.log("socket connected")
  //JOIN-USER->
  socket.on("join", (username) => {
    users[username] = socket.id;
    console.log(users,"users")
    io.emit("online-users", Object.keys(users));
  });
// ------------------------------------------->


// LOCATION UPDATE (save + send to admin)
// socket.on("location-update", async ({ lt_user_id, lt_name, lt_latitude, lt_longitude,lt_app_time,lt_isInternetOn_Off,lt_locationOn_off,lt_location_permission }) => {

//     console.log(fromUser,"fromUser")
//     console.log(toUser,"toUser")
//     console.log(lat,"lat")
//     console.log(lng,"lng")
    
//   // save location in DB
// //   const loc = new Location({ username: fromUser, lat, lng });
// //   await loc.save();


//   // send live location to the specific user (admin)
//   const receiverId = users[toUser];
//   if (receiverId) {
//     io.to(receiverId).emit("user-location", { fromUser, lat, lng });
//   }
// });





socket.on("location-update", (data) => 
  {
  const {
    lt_user_id,
    lt_name,
    lt_latitude,
    lt_longitude,
    lt_app_time,
    lt_isInternetOn_Off,
    lt_locationOn_off,
    lt_location_permission,
  } = data;

  const sql = `
    INSERT INTO locations 
    (lt_user_id, lt_name, lt_latitude, lt_longitude, lt_app_time, lt_isInternetOn_Off, lt_locationOn_off, lt_location_permission) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      lt_user_id,
      lt_name,
      lt_latitude,
      lt_longitude,
      lt_app_time,
      lt_isInternetOn_Off,
      lt_locationOn_off,
      lt_location_permission,
    ],
    (err, result) => {
      if (err) {
        console.error("DB insert error:", err);
        return;
      }
      console.log("Location saved:", result.insertId);

      // send live location to admin
      io.emit("user-location", {
        lt_user_id,
        lt_name,
        lt_latitude,
        lt_longitude,
        lt_app_time,
      });
    }
  );
});








// ------------------------------------------->
  //DISCONNECT USER->
  socket.on("disconnect", () => {
    for (const [username, id] of Object.entries(users)) {
      if (id === socket.id) {
        delete users[username];
        break;
      }
    }
    io.emit("online-users", Object.keys(users));
  });
});

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
