import express from "express";
import db from "./src/config/dbconnect.js";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { userRoutes } from "./src/routes/UserRoutes.js";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use("/api/user/", userRoutes);

const users = {}; // username: socketId

io.on("connection", (socket) => {
  console.log("socket connected",socket.id);

  // JOIN-USER
  socket.on("join", (username) => {
    users[username] = socket.id;
    console.log(users, "users");
    io.emit("online-users", Object.keys(users));
  });

  // LOCATION UPDATE
  socket.on("location-update", (data) => {
    console.log(data,"testData")
  try {
//        const data = {
//     "lt_user_id":"85",
//       "lt_name":"demo_demo",
//       "lt_latitude":1.1,
//       "lt_longitude":1.1,
//       "lt_app_time":"12",
//       "lt_isInternetOn_Off":false,
//       "lt_locationOn_off":false,
//       "lt_location_permission":false
// }

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



    console.log("Received Location Data:", data);

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
          console.error("DB Insert Error:", err);
          socket.emit("error-message", { message: "Failed to save location" });
          return;
        }

        console.log("Location saved with ID:", result.insertId);

        // // Broadcast to all admins or dashboard clients
        // io.emit("user-location", {
        //   lt_user_id,
        //   lt_name,
        //   lt_latitude,
        //   lt_longitude,
        //   lt_app_time,
        // });
      }
    );
  } catch (err) {
    console.error("Unexpected Error:", err);
    socket.emit("error-message", { message: "Internal server error" });
  }
  socket.emit("get-user-location",data)
});

  // DISCONNECT USER
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
