const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const db = require("../db");

router.use(authMiddleware);

// ─── GROQ API HELPER ───────────────────────────────────────
async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured.");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an expert HR evaluator and recruitment specialist. Generate professional, detailed interview evaluation reports.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ─── AI RESUME SCORING ─────────────────────────────────────
function scoreResume(candidate, jobDescription) {
  const jd = jobDescription.toLowerCase();
  const candidateSkills = (candidate.skills || "")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  const candidatePosition = (candidate.position || "").toLowerCase();
  const candidateExp = parseInt(candidate.experience) || 0;

  const techKeywords = [
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "express",
    "mysql",
    "mongodb",
    "html",
    "css",
    "angular",
    "vue",
    "typescript",
    "php",
    "sql",
    "git",
    "docker",
    "aws",
    "rest",
    "api",
    "redux",
    "bootstrap",
    "tailwind",
    "figma",
    "linux",
    "c++",
    "c#",
    "kotlin",
    "swift",
    "flutter",
    "django",
    "spring",
    "laravel",
    "postgresql",
    "firebase",
    "graphql",
    "sass",
    "webpack",
    "jest",
    "kubernetes",
    "jenkins",
    "agile",
    "scrum",
    "machine learning",
    "deep learning",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "tableau",
    "selenium",
    "postman",
    "jira",
  ];

  const jdSkills = techKeywords.filter((k) => jd.includes(k));
  let matchedSkills = [],
    missingSkills = [];
  jdSkills.forEach((skill) => {
    const has =
      candidateSkills.some((cs) => cs.includes(skill) || skill.includes(cs)) ||
      (candidate.skills || "").toLowerCase().includes(skill);
    if (has) matchedSkills.push(skill);
    else missingSkills.push(skill);
  });

  const skillScore =
    jdSkills.length > 0
      ? Math.round((matchedSkills.length / jdSkills.length) * 50)
      : 25;
  const expMatches = jd.match(/(\d+)\+?\s*years?/g) || [];
  let requiredExp = 0;
  if (expMatches.length > 0)
    requiredExp = Math.min(...expMatches.map((m) => parseInt(m)));

  let expScore =
    requiredExp === 0
      ? 20
      : candidateExp >= requiredExp
        ? 25
        : candidateExp >= requiredExp - 1
          ? 18
          : candidateExp >= requiredExp - 2
            ? 12
            : 5;
  const titleKeywords = candidatePosition.split(/\s+/);
  const titleMatches = titleKeywords.filter(
    (w) => w.length > 3 && jd.includes(w),
  );
  const titleScore =
    titleMatches.length > 0
      ? Math.min(15, titleMatches.length * 6)
      : jd.includes("developer") && candidatePosition.includes("developer")
        ? 8
        : 4;
  const softKeywords = [
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "analytical",
    "collaborative",
    "creative",
    "adaptable",
  ];
  const softMatches = softKeywords.filter(
    (k) => jd.includes(k) && (candidate.skills || "").toLowerCase().includes(k),
  );
  const softScore = Math.min(10, softMatches.length * 3 + 3);
  const totalScore = Math.min(
    100,
    skillScore + expScore + titleScore + softScore,
  );

  const strengths = [];
  if (matchedSkills.length > 0)
    strengths.push(
      `Proficient in ${matchedSkills
        .slice(0, 3)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(", ")}`,
    );
  if (candidateExp >= requiredExp && requiredExp > 0)
    strengths.push(
      `${candidateExp} years meets the ${requiredExp}+ year requirement`,
    );
  else if (candidateExp > 0)
    strengths.push(
      `${candidateExp} year${candidateExp !== 1 ? "s" : ""} of relevant experience`,
    );
  if (titleMatches.length > 0)
    strengths.push("Role title aligns with job requirements");
  if (strengths.length === 0)
    strengths.push("Has foundational background in the domain");

  const gaps = [];
  if (missingSkills.length > 0)
    gaps.push(
      `Missing: ${missingSkills
        .slice(0, 3)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(", ")}`,
    );
  if (requiredExp > 0 && candidateExp < requiredExp)
    gaps.push(
      `Needs ${requiredExp - candidateExp} more year${requiredExp - candidateExp !== 1 ? "s" : ""} of experience`,
    );
  if (gaps.length === 0 && totalScore < 80)
    gaps.push("Profile needs more detail to fully evaluate");

  let recommendation, summary;
  if (totalScore >= 80) {
    recommendation = "Strong Hire";
    summary = `${candidate.name} is an excellent match. Recommended for immediate hire.`;
  } else if (totalScore >= 65) {
    recommendation = "Hire";
    summary = `${candidate.name} meets most requirements. A technical interview is recommended.`;
  } else if (totalScore >= 45) {
    recommendation = "Maybe";
    summary = `${candidate.name} partially matches. Consider if gaps can be bridged with training.`;
  } else {
    recommendation = "No Hire";
    summary = `${candidate.name} does not currently meet core requirements.`;
  }

  const breakdown = [
    { label: "Skills Match", score: skillScore, max: 50, color: "#4f46e5" },
    { label: "Experience", score: expScore, max: 25, color: "#10b981" },
    { label: "Role Alignment", score: titleScore, max: 15, color: "#f59e0b" },
    {
      label: "Profile Completeness",
      score: softScore,
      max: 10,
      color: "#06b6d4",
    },
  ];

  return {
    score: totalScore,
    strengths,
    gaps,
    summary,
    recommendation,
    breakdown,
  };
}

// ─── POST /api/ai/score-resume ─────────────────────────────
router.post("/score-resume", async (req, res) => {
  try {
    const { candidate_id, job_description } = req.body;
    if (!candidate_id || !job_description)
      return res.status(400).json({
        success: false,
        message: "candidate_id and job_description required.",
      });
    if (job_description.trim().length < 30)
      return res
        .status(400)
        .json({ success: false, message: "Job description is too short." });

    const [rows] = await db.query(
      "SELECT id, name, position, experience, skills FROM candidates WHERE id = ?",
      [candidate_id],
    );
    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });

    const result = scoreResume(rows[0], job_description);
    await db.query("UPDATE candidates SET ai_score = ? WHERE id = ?", [
      result.score,
      candidate_id,
    ]);
    res.json({ success: true, candidate_name: rows[0].name, ...result });
  } catch (err) {
    console.error("AI score error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Scoring failed: " + err.message });
  }
});

// ─── POST /api/ai/generate-report (GROQ LLM) ───────────────
router.post("/generate-report", async (req, res) => {
  try {
    const { candidate_id } = req.body;
    if (!candidate_id)
      return res
        .status(400)
        .json({ success: false, message: "candidate_id required." });

    const [cRows] = await db.query("SELECT * FROM candidates WHERE id = ?", [
      candidate_id,
    ]);
    if (!cRows.length)
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    const c = cRows[0];

    const [feedbacks] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1",
      [candidate_id],
    );
    if (!feedbacks.length)
      return res.status(400).json({
        success: false,
        message: "No feedback found. Submit feedback first.",
      });
    const fb = feedbacks[0];

    const overall = (
      (fb.technical_score + fb.communication_score + fb.problem_solving_score) /
      3
    ).toFixed(1);

    // ── Build prompt for Groq LLM ──────────────────────────
    const prompt = `Generate a professional interview evaluation report for the following candidate:

      CANDIDATE INFORMATION:
      - Name: ${c.name}
      - Position Applied: ${c.position}
      - Years of Experience: ${c.experience || 0}
      - Skills: ${c.skills || "Not specified"}

      INTERVIEW SCORES (out of 10):
      - Technical Skills: ${fb.technical_score}/10
      - Communication: ${fb.communication_score}/10
      - Problem Solving: ${fb.problem_solving_score}/10
      - Overall Score: ${overall}/10

      INTERVIEWER RECOMMENDATION: ${fb.recommendation}
      INTERVIEWER REMARKS: ${fb.remarks || "No remarks provided"}

      Please generate a detailed, professional evaluation report that includes:
      1. Executive Summary (2-3 sentences)
      2. Technical Assessment
      3. Communication & Soft Skills Assessment
      4. Problem Solving Assessment
      5. Strengths (3 bullet points)
      6. Areas for Improvement (2-3 bullet points)
      7. Final Recommendation with justification

      Format it as a clean professional report. Be specific, detailed and use the actual scores provided.`;

    let report;
    try {
      // Try Groq LLM first
      const llmResponse = await callGroq(prompt);
      report = `INTERVIEW EVALUATION REPORT — AI Generated
      ==========================================
      Candidate   : ${c.name}
      Position    : ${c.position}
      Date        : ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
      Overall Score: ${overall}/10
      Recommendation: ${fb.recommendation}

      Generated by Groq LLM (Llama 3)
      ==========================================

      ${llmResponse}

      ---
      Report generated by InterviewPro AI Evaluation System (Powered by Groq)`;
          } catch (llmErr) {
            console.error("Groq LLM failed, using fallback:", llmErr.message);
            // Fallback to rule-based if Groq fails
            const techLevel =
              fb.technical_score >= 8
                ? "exceptional"
                : fb.technical_score >= 6
                  ? "strong"
                  : "moderate";
            const commLevel =
              fb.communication_score >= 8
                ? "excellent"
                : fb.communication_score >= 6
                  ? "good"
                  : "adequate";
            const probLevel =
              fb.problem_solving_score >= 8
                ? "outstanding"
                : fb.problem_solving_score >= 6
                  ? "solid"
                  : "satisfactory";
            report = `INTERVIEW EVALUATION REPORT
      ===============================
      Candidate   : ${c.name}
      Position    : ${c.position}
      Experience  : ${c.experience || 0} year(s)
      Date        : ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}

      SCORES
      ------
      Technical Skills : ${fb.technical_score}/10 (${techLevel})
      Communication    : ${fb.communication_score}/10 (${commLevel})
      Problem Solving  : ${fb.problem_solving_score}/10 (${probLevel})
      Overall Score    : ${overall}/10

      EVALUATION SUMMARY
      ------------------
      The candidate demonstrated ${techLevel} technical skills and ${commLevel} communication abilities.

      RECOMMENDATION : ${fb.recommendation}

      REMARKS
      -------
      ${fb.remarks || "No additional remarks."}

      ---
      Report generated by InterviewPro AI Evaluation System`;
    }

    res.json({
      success: true,
      report,
      candidate_name: c.name,
      overall_score: overall,
      recommendation: fb.recommendation,
    });
  } catch (err) {
    console.error("Report generation error:", err.message);
    res.status(500).json({
      success: false,
      message: "Report generation failed: " + err.message,
    });
  }
});

module.exports = router;
