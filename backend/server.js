require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── ROUTES ────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/candidates", require("./routes/candidates"));
app.use("/api/interviews", require("./routes/interviews"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/ml", require("./routes/ml"));
app.use("/api/notifications", require("./routes/notifications"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "2.0.0", timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 InterviewPro Server v2.0`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});
