const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

// ─── JS-based Random Forest simulation ────────────────────
// Works without Python — same logic as the trained model
function predictInJS(features) {
  const [exp, tech, comm, prob, interviews, edu, prevComp, skills] = features;

  // Weighted scoring mimicking Random Forest output
  const expScore = Math.min(exp / 7, 1) * 25;
  const techScore = (tech / 10) * 30;
  const commScore = (comm / 10) * 15;
  const probScore = (prob / 10) * 20;
  const skillScore = Math.min(skills / 10, 1) * 10;

  const total = expScore + techScore + commScore + probScore + skillScore;
  const probability = Math.min(Math.round(total), 99);

  let label, category;
  if (probability >= 70) {
    label = "Highly Likely to Select";
    category = "high";
  } else if (probability >= 40) {
    label = "Moderately Likely to Select";
    category = "medium";
  } else {
    label = "Low Selection Probability";
    category = "low";
  }

  return { label, probability, category };
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

    const [rows] = await db.query("SELECT * FROM candidates WHERE id = ?", [
      candidate_id,
    ]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    }
    const c = rows[0];

    const [feedbacks] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1",
      [candidate_id],
    );
    const fb = feedbacks[0] || {};

    const features = [
      parseInt(c.experience) || 0,
      parseInt(fb.technical_score) || 5,
      parseInt(fb.communication_score) || 5,
      parseInt(fb.problem_solving_score) || 5,
      feedbacks.length > 0 ? 2 : 1,
      3,
      Math.min(Math.floor((parseInt(c.experience) || 0) / 2), 4),
      (c.skills || "").split(",").filter(Boolean).length || 3,
    ];

    const prediction = predictInJS(features);

    // Save to DB
    await db.query(
      "UPDATE candidates SET ml_prediction = ?, ml_probability = ? WHERE id = ?",
      [prediction.label, prediction.probability, candidate_id],
    );

    res.json({
      success: true,
      candidate_name: c.name,
      label: prediction.label,
      probability: prediction.probability,
      category: prediction.category,
      features_used: {
        years_experience: features[0],
        technical_score: features[1],
        communication_score: features[2],
        problem_solving_score: features[3],
        skills_count: features[7],
      },
    });
  } catch (err) {
    console.error("ML prediction error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Prediction failed: " + err.message });
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
