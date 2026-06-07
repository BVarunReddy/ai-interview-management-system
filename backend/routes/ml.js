const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

// ─── Helper: run Python prediction script ─────────────────
function runPythonPredictor(features) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../../ML/predict.py");
    const args = features.map(String);

    const py = spawn("python", [scriptPath, ...args]);

    let output = "";
    let error = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });
    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("Python script failed: " + error));
        return;
      }
      try {
        const result = JSON.parse(output.trim());
        resolve(result);
      } catch (e) {
        reject(new Error("Could not parse Python output: " + output));
      }
    });
  });
}

// ─── POST /api/ml/predict ─────────────────────────────────
router.post("/predict", async (req, res) => {
  try {
    const { candidate_id } = req.body;

    if (!candidate_id) {
      return res
        .status(400)
        .json({ success: false, message: "candidate_id is required." });
    }

    // Fetch candidate
    const [rows] = await db.query("SELECT * FROM candidates WHERE id = ?", [
      candidate_id,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    }
    const c = rows[0];

    // Fetch their feedback (for scores)
    const [feedbacks] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1",
      [candidate_id],
    );

    const fb = feedbacks[0] || {};

    // Build feature vector matching training data columns:
    // years_experience, technical_score, communication_score,
    // problem_solving_score, num_interviews, education_level,
    // previous_companies, skills_count
    const features = [
      parseInt(c.experience) || 0,
      parseInt(fb.technical_score) || 5,
      parseInt(fb.communication_score) || 5,
      parseInt(fb.problem_solving_score) || 5,
      feedbacks.length > 0 ? 2 : 1, // num_interviews proxy
      3, // education_level default (Bachelor's)
      Math.min(Math.floor((parseInt(c.experience) || 0) / 2), 4), // prev_companies estimate
      (c.skills || "").split(",").filter(Boolean).length || 3, // skills_count
    ];

    // Call Python ML script
    const prediction = await runPythonPredictor(features);

    // Save prediction to DB
    await db.query(
      "UPDATE candidates SET ml_prediction = ?, ml_probability = ? WHERE id = ?",
      [prediction.label, prediction.probability, candidate_id],
    );

    res.json({ success: true, candidate_name: c.name, ...prediction });
  } catch (err) {
    console.error("ML prediction error:", err.message);

    // Fallback: use rule-based prediction if Python not available
    res.status(500).json({
      success: false,
      message:
        "ML prediction failed. Make sure Python and the model are set up. Error: " +
        err.message,
    });
  }
});

// ─── GET /api/ml/predictions ──────────────────────────────
router.get("/predictions", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, position, experience, ai_score, ml_prediction, ml_probability, status
       FROM candidates
       WHERE ml_prediction IS NOT NULL
       ORDER BY ml_probability DESC`,
    );
    res.json({ success: true, predictions: rows });
  } catch (err) {
    console.error("Get predictions error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
