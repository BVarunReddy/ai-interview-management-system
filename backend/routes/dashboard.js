const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

router.get("/stats", async (req, res) => {
  try {
    const [[candidateStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Selected') AS selected,
        SUM(status = 'Rejected') AS rejected,
        SUM(status = 'Pending') AS pending,
        SUM(status = 'Screening') AS screening,
        SUM(status = 'Interview') AS interview,
        SUM(status = 'Offer') AS offer,
        ROUND(AVG(ai_score), 1) AS avg_ai_score
      FROM candidates
    `);

    const [[interviewStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(round_name = 'Technical') AS technical,
        SUM(round_name = 'HR') AS hr,
        SUM(round_name = 'Managerial') AS managerial,
        SUM(round_name = 'Screening') AS screening,
        SUM(status = 'Scheduled') AS upcoming,
        SUM(DATE(interview_date) = CURDATE()) AS today
      FROM interviews
    `);

    const [[feedbackStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        ROUND(AVG((technical_score + communication_score + problem_solving_score) / 3.0), 1) AS avg_score,
        SUM(recommendation = 'Strong Hire') AS strong_hire,
        SUM(recommendation = 'Hire') AS hire
      FROM feedback
    `);

    const [trend] = await db.query(`
      SELECT
        YEAR(created_at) AS yr,
        MONTH(created_at) AS mo,
        DATE_FORMAT(MIN(created_at), '%b %Y') AS month,
        COUNT(*) AS count
      FROM candidates
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY yr ASC, mo ASC
    `);

    res.json({
      success: true,
      candidates: candidateStats,
      interviews: interviewStats,
      feedback: feedbackStats,
      trend,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const [candidates] = await db.query(
      `SELECT 'candidate' AS type, name AS title, status, created_at
       FROM candidates ORDER BY created_at DESC LIMIT 5`
    );
    const [interviews] = await db.query(
      `SELECT 'interview' AS type, candidate_name AS title, round_name AS status, created_at
       FROM interviews ORDER BY created_at DESC LIMIT 5`
    );

    const activity = [...candidates, ...interviews]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);

    res.json({ success: true, activity });
  } catch (err) {
    console.error("Activity error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;