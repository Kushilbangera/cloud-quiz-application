const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env")
});

const quizRoutes = require("./routes/quizRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Cloud Quiz Application API is running 🚀"
  });
});

app.use("/api", quizRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});