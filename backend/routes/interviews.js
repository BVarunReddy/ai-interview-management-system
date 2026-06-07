const express = require("express");
const router = express.Router();
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);

async function notify(title, message, type = "info") {
  try {
    await db.query("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)", [title, message, type]);
  } catch (e) {}
}

// SCHEDULE
router.post("/", async (req, res) => {
  try {
    const { candidate_id, interviewer, round_name, interview_date, interview_time, notes } = req.body;
    if (!candidate_id || !interviewer || !round_name || !interview_date || !interview_time) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    const [candidate] = await db.query("SELECT name FROM candidates WHERE id = ?", [candidate_id]);
    if (candidate.length === 0) return res.status(404).json({ success: false, message: "Candidate not found." });

    const [result] = await db.query(
      `INSERT INTO interviews (candidate_id, candidate_name, interviewer, round_name, interview_date, interview_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [candidate_id, candidate[0].name, interviewer, round_name, interview_date, interview_time, notes || null]
    );
    await notify(
      "Interview Scheduled",
      `${round_name} interview scheduled for ${candidate[0].name} with ${interviewer} on ${interview_date}`,
      "info"
    );
    res.status(201).json({ success: true, message: "Interview scheduled successfully.", interviewId: result.insertId });
  } catch (err) {
    console.error("Schedule error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const { search, round, status } = req.query;
    let where = "WHERE 1=1";
    const params = [];
    if (search) { where += " AND (i.candidate_name LIKE ? OR i.interviewer LIKE ?)"; const s=`%${search}%`; params.push(s,s); }
    if (round && round !== "All") { where += " AND i.round_name = ?"; params.push(round); }
    if (status && status !== "All") { where += " AND i.status = ?"; params.push(status); }
    const [interviews] = await db.query(
      `SELECT i.*, c.position, c.email AS candidate_email
       FROM interviews i LEFT JOIN candidates c ON i.candidate_id = c.id
       ${where} ORDER BY i.interview_date DESC, i.interview_time ASC`,
      params
    );
    res.json({ success: true, interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// UPDATE STATUS
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["Scheduled","Completed","Cancelled"];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: "Invalid status." });
    const [rows] = await db.query("SELECT candidate_name, round_name FROM interviews WHERE id = ?", [req.params.id]);
    await db.query("UPDATE interviews SET status = ? WHERE id = ?", [status, req.params.id]);
    if (rows.length) {
      await notify(
        `Interview ${status}`,
        `${rows[0].round_name} interview for ${rows[0].candidate_name} marked as ${status}`,
        status === "Completed" ? "success" : "warning"
      );
    }
    res.json({ success: true, message: "Interview status updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM interviews WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, message: "Interview deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;