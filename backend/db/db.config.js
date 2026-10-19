import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user:
    process.env.DB_USER || "chatgpt_clone_app",
  password: process.env.DB_PASSWORD ?? "",
  database:
    process.env.DB_NAME || "chatgpt_clone",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: false,
});

export default pool;
