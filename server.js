// import express from "express";
// import db from "./src/config/dbconnect.js";
// import http from "http";
// import cors from "cors";
// import { Server } from "socket.io";
// import { userRoutes } from "./src/routes/UserRoutes.js";
// import dotenv from "dotenv";

// dotenv.config();
// const PORT = process.env.PORT || 5000;
// const app = express();
// app.use(cors());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//   },
// });
// //===========PARENT-ROUTE START
// app.use("/api/user/", userRoutes);
// //===========PARENT-ROUTE END

// const users = {}; // username: socketId


// io.on("connection", (socket) => {
//   console.log("socket connected",socket.id);

//    // JOIN USER
//   socket.on("join", ({ lt_user_id, lt_name }) => {
//     console.log("Active Users:", users);

//     users[lt_user_id] = {
//       socketId: socket.id,
//       lt_name,
//       lt_latitude: null,
//       lt_longitude: null,
//       lastUpdated: null,
//     };

//     console.log("Active Users:", users);
//     io.emit("online-users", Object.values(users)); // send full object array
//     });

// socket.on("location-update", (data, ack) => {
//   try {
//     const {
//       lt_user_id,
//       lt_name,
//       lt_latitude,
//       lt_longitude,
//       lt_app_time,
//       lt_isInternetOn_Off,
//       lt_locationOn_off,
//       lt_location_permission,
//     } = data;

//     // Save in DB...
//     const sql = `
//       INSERT INTO location_tracker 
//       (lt_user_id, lt_name, lt_latitude, lt_longitude, lt_app_time, lt_isInternetOn_Off, lt_locationOn_off, lt_location_permission) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;
//     db.query(
//       sql,
//       [
//         lt_user_id,
//         lt_name,
//         lt_latitude,
//         lt_longitude,
//         lt_app_time,
//         lt_isInternetOn_Off,
//         lt_locationOn_off,
//         lt_location_permission,
//       ],
//       (err, result) => {
//         if (err) {
//           console.error("DB Insert Error:", err);
//           if (ack) ack({ status: "error", message: "DB insert failed" });
//           return;
//         }

//         // update user cache
//         if (users[lt_user_id]) {
//           users[lt_user_id].lt_latitude = lt_latitude;
//           users[lt_user_id].lt_longitude = lt_longitude;
//           users[lt_user_id].lastUpdated = Date.now();
//         }

//         // ack back to sender (mobile app)
//         if (ack) {
//           ack({
//             status: "success",
//             message: "Location updated successfully",
//             userId: lt_user_id,
//             lat: lt_latitude,
//             lng: lt_longitude,
//           });
//         }

//         // broadcast location update to all dashboards
//         io.emit("user-location", {
//           lt_user_id,
//           lt_name,
//           lt_latitude,
//           lt_longitude,
//           lt_app_time,
//           lt_isInternetOn_Off,
//           lt_locationOn_off,
//           lt_location_permission,
//         });
//       }
//     );
//   } catch (err) {
//     console.error("Unexpected Error:", err);
//     socket.emit("error-message", { message: "Internal server error" });
//   }
// });


























//   // DISCONNECT USER
//   socket.on("disconnect", () => {
//     for (const [user_id, userObj] of Object.entries(users)) {
//       if (userObj.socketId === socket.id) {
//         delete users[user_id];
//         break;
//       }
//     }
//       io.emit("online-users", Object.values(users));
//     });
// });

// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });






























































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

//===========PARENT-ROUTE START
app.use("/api/user/", userRoutes);
//===========PARENT-ROUTE END

const users = {}; // Cache of active users

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  // JOIN USER
  socket.on("join", ({ lt_user_id, lt_name }) => {
    users[lt_user_id] = {
      socketId: socket.id,
      lt_name,
      lt_latitude: null,
      lt_longitude: null,
      lt_app_time: null,
      lt_isInternetOn_Off: null,
      lt_locationOn_off: null,
      lt_location_permission: null,
      lastUpdated: null,
      lastSavedToDB: null, // track last DB save time
    };

    io.emit("online-users", Object.values(users));
  });

  // LOCATION UPDATE (update cache only, no DB insert)
  socket.on("location-update", (data, ack) => {
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

    if (users[lt_user_id]) {
      users[lt_user_id] = {
        ...users[lt_user_id],
        lt_name,
        lt_latitude,
        lt_longitude,
        lt_app_time,
        lt_isInternetOn_Off,
        lt_locationOn_off,
        lt_location_permission,
        lastUpdated: Date.now(),
      };
    }

    if (ack) {
      ack({
        status: "success",
        message: "Location cached successfully",
      });
    }

    // Broadcast to dashboards immediately
    io.emit("user-location", data);
  });

  // DISCONNECT USER
  socket.on("disconnect", () => {
    for (const [user_id, userObj] of Object.entries(users)) {
      if (userObj.socketId === socket.id) {
        delete users[user_id];
        break;
      }
    }
    io.emit("online-users", Object.values(users));
  });
});

// ======================= DB INSERT EVERY 30s =========================
setInterval(() => {
  const now = Date.now();

  for (const [lt_user_id, userObj] of Object.entries(users)) {
    if (
      userObj.lt_latitude &&
      userObj.lt_longitude &&
      (!userObj.lastSavedToDB || now - userObj.lastSavedToDB >= 30000) // every 30s per user
    ) {
      const sql = `
        INSERT INTO location_tracker 
        (lt_user_id, lt_name, lt_latitude, lt_longitude, lt_app_time, lt_isInternetOn_Off, lt_locationOn_off, lt_location_permission) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(
        sql,
        [
          lt_user_id,
          userObj.lt_name,
          userObj.lt_latitude,
          userObj.lt_longitude,
          userObj.lt_app_time,
          userObj.lt_isInternetOn_Off,
          userObj.lt_locationOn_off,
          userObj.lt_location_permission,
        ],
        (err) => {
          if (err) {
            console.error("DB Insert Error:", err);
          } else {
            users[lt_user_id].lastSavedToDB = now;
            console.log(`✅ Location saved for user ${lt_user_id}`);
          }
        }
      );
    }
  }
}, 10000); // run check every 10s

// ======================= START SERVER =========================
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
