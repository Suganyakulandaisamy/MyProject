import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/index.js";
import { connectDb } from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "AAQAP backend running" });
});

app.use("/api", router);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`AAQAP backend listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to SQLite:", err.message);
    process.exit(1);
  });
