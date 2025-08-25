const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",      
  password: "",      
  database: "tesyyyyyy" 
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
  } else {
    console.log("MySQL connected...");
  }
});

module.exports = db;
