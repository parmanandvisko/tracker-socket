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
  // socket.on("join", (username) => {
  //   users[username] = socket.id;
  //   console.log(users, "users");
  //   io.emit("online-users", Object.keys(users));
  // });



   // JOIN USER
  socket.on("join", ({ lt_user_id, lt_name }) => {
    users[lt_user_id] = {
      socketId: socket.id,
      lt_name,
      lt_latitude: null,
      lt_longitude: null,
      lastUpdated: null,
    };

    console.log("Active Users:", users);
    io.emit("online-users", Object.values(users)); // send full object array
  });

  // LOCATION UPDATE
//   socket.on("location-update", (data,ack) => {
//     console.log(data,"testData")
//   try {
// //        const data = {
// //     "lt_user_id":"85",
// //       "lt_name":"demo_demo",
// //       "lt_latitude":1.1,
// //       "lt_longitude":1.1,
// //       "lt_app_time":"12",
// //       "lt_isInternetOn_Off":false,
// //       "lt_locationOn_off":false,
// //       "lt_location_permission":false
// // }

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



//     console.log("Received Location Data:", data);

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
//        if (err) {
//   console.error("DB Insert Error:", err);
//   if (ack) ack({ status: "error", message: "DB insert failed" });
//   return;
// }

//         if (users[lt_user_id]) {
//         users[lt_user_id].lt_latitude = lt_latitude;
//         users[lt_user_id].lt_longitude = lt_longitude;
//         users[lt_user_id].lastUpdated = Date.now();
//       }



//        if (ack) {
//   ack({
//     status: "success",
//     "testing":data,
//     message: "Location updated successfully",
//     userId: lt_user_id,
//     lat: lt_latitude,
//     lng: lt_longitude,
//   });
// }
//         // Broadcast to all admins or dashboard clients
//         io.emit("user-location", {
//           lt_user_id,
//           lt_name,
//           lt_latitude,
//           lt_longitude,
//           lt_app_time,
//         });
//       }
//     );

//   } catch (err) {
//     console.error("Unexpected Error:", err);
//     socket.emit("error-message", { message: "Internal server error" });
//   }
//   socket.emit("get-user-location",data)
// });

socket.on("location-update", (data, ack) => {
  try {
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

    // Save in DB...
    const sql = `
      INSERT INTO location_tracker 
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
          if (ack) ack({ status: "error", message: "DB insert failed" });
          return;
        }

        // update user cache
        if (users[lt_user_id]) {
          users[lt_user_id].lt_latitude = lt_latitude;
          users[lt_user_id].lt_longitude = lt_longitude;
          users[lt_user_id].lastUpdated = Date.now();
        }

        // ack back to sender (mobile app)
        if (ack) {
          ack({
            status: "success",
            message: "Location updated successfully",
            userId: lt_user_id,
            lat: lt_latitude,
            lng: lt_longitude,
          });
        }

        // 🔹 broadcast location update to all dashboards
        io.emit("user-location", {
          lt_user_id,
          lt_name,
          lt_latitude,
          lt_longitude,
          lt_app_time,
        });
      }
    );
  } catch (err) {
    console.error("Unexpected Error:", err);
    socket.emit("error-message", { message: "Internal server error" });
  }
});






  // DISCONNECT USER
  // socket.on("disconnect", () => {
  //   for (const [username, id] of Object.entries(users)) {
  //     if (id === socket.id) {
  //       delete users[username];
  //       break;
  //     }
  //   }
  //   io.emit("online-users", Object.keys(users));
  // });


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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
