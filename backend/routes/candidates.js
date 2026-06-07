const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { authMiddleware } = require("../middleware/auth");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase()))
      cb(null, true);
    else cb(new Error("Only PDF, DOC, and DOCX files are allowed."));
  },
});

// Helper — create notification
async function notify(title, message, type = "info", user_id = null) {
  try {
    await db.query(
      "INSERT INTO notifications (title, message, type, user_id) VALUES (?, ?, ?, ?)",
      [title, message, type, user_id],
    );
  } catch (e) {
    /* silent fail */
  }
}

router.use(authMiddleware);

// ADD CANDIDATE
router.post("/", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, position, experience, skills } = req.body;
    if (!name || !email || !position) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email, and position are required.",
        });
    }
    const [existing] = await db.query(
      "SELECT id FROM candidates WHERE email = ?",
      [email],
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({
          success: false,
          message: "A candidate with this email already exists.",
        });
    }
    const resumePath = req.file ? req.file.filename : null;
    const [result] = await db.query(
      `INSERT INTO candidates (name, email, phone, position, experience, skills, resume_path, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phone || null,
        position,
        parseInt(experience) || 0,
        skills || null,
        resumePath,
        req.user.id,
      ],
    );
    await notify(
      "New Candidate Added",
      `${name} has been added as ${position}`,
      "success",
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Candidate added successfully.",
        candidateId: result.insertId,
      });
  } catch (err) {
    console.error("Add candidate error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET ALL
router.get("/", async (req, res) => {
  try {
    const { status, search, page = 1, limit = 200 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "WHERE 1=1";
    const params = [];
    if (status && status !== "All") {
      where += " AND c.status = ?";
      params.push(status);
    }
    if (search) {
      where += " AND (c.name LIKE ? OR c.email LIKE ? OR c.position LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    const [candidates] = await db.query(
      `SELECT c.*, u.name AS created_by_name
       FROM candidates c LEFT JOIN users u ON c.created_by = u.id
       ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM candidates c ${where}`,
      params,
    );
    res.json({
      success: true,
      candidates,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get candidates error:", err.message);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// GET ONE
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS created_by_name FROM candidates c
       LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?`,
      [req.params.id],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    const [interviews] = await db.query(
      "SELECT * FROM interviews WHERE candidate_id = ? ORDER BY interview_date DESC",
      [req.params.id],
    );
    const [feedback] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC",
      [req.params.id],
    );
    res.json({ success: true, candidate: rows[0], interviews, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// UPDATE STATUS
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const valid = [
      "Pending",
      "Screening",
      "Interview",
      "Offer",
      "Selected",
      "Rejected",
    ];
    if (!valid.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    const [rows] = await db.query(
      "SELECT name, position FROM candidates WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    await db.query("UPDATE candidates SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    const typeMap = {
      Selected: "success",
      Rejected: "error",
      Offer: "success",
    };
    await notify(
      "Candidate Status Updated",
      `${rows[0].name} moved to ${status} stage`,
      typeMap[status] || "info",
    );
    res.json({ success: true, message: "Status updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// UPDATE AI SCORE
router.put("/:id/ai-score", async (req, res) => {
  try {
    const { ai_score } = req.body;
    await db.query("UPDATE candidates SET ai_score = ? WHERE id = ?", [
      ai_score,
      req.params.id,
    ]);
    res.json({ success: true, message: "AI score updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT resume_path, name FROM candidates WHERE id = ?",
      [req.params.id],
    );
    if (rows.length > 0 && rows[0].resume_path) {
      const filePath = path.join(uploadDir, rows[0].resume_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const [result] = await db.query("DELETE FROM candidates WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    res.json({ success: true, message: "Candidate deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
