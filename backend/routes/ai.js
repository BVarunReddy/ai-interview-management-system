const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const db = require("../db");

router.use(authMiddleware);

// ─── FREE LOCAL AI SCORING ENGINE ──────────────────────────
// No API key needed — smart keyword + experience matching

function scoreResume(candidate, jobDescription) {
  const jd = jobDescription.toLowerCase();
  const candidateSkills = (candidate.skills || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
  const candidatePosition = (candidate.position || "").toLowerCase();
  const candidateExp = parseInt(candidate.experience) || 0;

  // ── 1. Skills match (50 points) ──────────────────────────
  const techKeywords = [
    "javascript","python","java","react","node","express","mysql","mongodb",
    "html","css","angular","vue","typescript","php","sql","git","docker",
    "aws","rest","api","redux","bootstrap","tailwind","figma","linux",
    "c++","c#","kotlin","swift","flutter","django","spring","laravel",
    "postgresql","firebase","graphql","sass","webpack","jest","mocha",
    "kubernetes","jenkins","ci/cd","agile","scrum","excel","powerpoint",
    "machine learning","deep learning","tensorflow","pytorch","pandas",
    "numpy","r","tableau","power bi","selenium","postman","jira"
  ];

  // Extract skills mentioned in JD
  const jdSkills = techKeywords.filter(k => jd.includes(k));

  let matchedSkills = [];
  let missingSkills = [];

  jdSkills.forEach(skill => {
    const candidateHasIt = candidateSkills.some(cs =>
      cs.includes(skill) || skill.includes(cs)
    ) || (candidate.skills || "").toLowerCase().includes(skill);

    if (candidateHasIt) matchedSkills.push(skill);
    else missingSkills.push(skill);
  });

  const skillScore = jdSkills.length > 0
    ? Math.round((matchedSkills.length / jdSkills.length) * 50)
    : 25; // neutral if JD has no detectable skills

  // ── 2. Experience match (25 points) ─────────────────────
  // Extract required years from JD
  const expMatches = jd.match(/(\d+)\+?\s*years?/g) || [];
  let requiredExp = 0;
  if (expMatches.length > 0) {
    const nums = expMatches.map(m => parseInt(m));
    requiredExp = Math.min(...nums); // use minimum requirement
  }

  let expScore = 0;
  if (requiredExp === 0) {
    expScore = 20; // no exp requirement stated
  } else if (candidateExp >= requiredExp) {
    expScore = 25; // meets or exceeds
  } else if (candidateExp >= requiredExp - 1) {
    expScore = 18; // 1 year short
  } else if (candidateExp >= requiredExp - 2) {
    expScore = 12; // 2 years short
  } else {
    expScore = 5; // significantly under
  }

  // ── 3. Position/title match (15 points) ─────────────────
  const titleKeywords = candidatePosition.split(/\s+/);
  const titleMatches = titleKeywords.filter(word =>
    word.length > 3 && jd.includes(word)
  );
  const titleScore = titleMatches.length > 0
    ? Math.min(15, titleMatches.length * 6)
    : (jd.includes("developer") && candidatePosition.includes("developer") ? 8 : 4);

  // ── 4. Soft skills / keywords bonus (10 points) ──────────
  const softKeywords = [
    "communication","teamwork","leadership","problem solving","analytical",
    "detail","organized","initiative","collaborative","creative","adaptable"
  ];
  const softMatches = softKeywords.filter(k =>
    jd.includes(k) && (candidate.skills || "").toLowerCase().includes(k)
  );
  const softScore = Math.min(10, softMatches.length * 3 + 3);

  // ── Final score ──────────────────────────────────────────
  const totalScore = Math.min(100, skillScore + expScore + titleScore + softScore);

  // ── Strengths (matched skills + experience) ──────────────
  const strengths = [];
  if (matchedSkills.length > 0) {
    strengths.push(`Proficient in ${matchedSkills.slice(0,3).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}`);
  }
  if (candidateExp >= requiredExp && requiredExp > 0) {
    strengths.push(`${candidateExp} years of experience meets the ${requiredExp}+ year requirement`);
  } else if (candidateExp > 0) {
    strengths.push(`${candidateExp} year${candidateExp !== 1 ? "s" : ""} of relevant experience`);
  }
  if (titleMatches.length > 0) {
    strengths.push(`Role title aligns with job requirements`);
  }
  if (strengths.length === 0) strengths.push("Has foundational background in the domain");

  // ── Gaps (missing skills + experience) ───────────────────
  const gaps = [];
  if (missingSkills.length > 0) {
    gaps.push(`Missing skills: ${missingSkills.slice(0,3).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}`);
  }
  if (requiredExp > 0 && candidateExp < requiredExp) {
    gaps.push(`Needs ${requiredExp - candidateExp} more year${requiredExp - candidateExp !== 1 ? "s" : ""} of experience`);
  }
  if (gaps.length === 0 && totalScore < 80) {
    gaps.push("Profile needs more detail to fully evaluate");
  }

  // ── Summary ──────────────────────────────────────────────
  let recommendation, summary;
  if (totalScore >= 80) {
    recommendation = "Strong Hire";
    summary = `${candidate.name} is an excellent match for this role with strong skill alignment and sufficient experience. Recommended for immediate interview.`;
  } else if (totalScore >= 65) {
    recommendation = "Hire";
    summary = `${candidate.name} meets most of the job requirements and shows good potential. A technical interview is recommended to assess depth.`;
  } else if (totalScore >= 45) {
    recommendation = "Maybe";
    summary = `${candidate.name} partially matches the role but has some skill or experience gaps. Consider if gaps can be bridged with training.`;
  } else {
    recommendation = "No Hire";
    summary = `${candidate.name} does not currently meet the core requirements for this position. Significant upskilling would be needed.`;
  }

  // ── Breakdown for UI ─────────────────────────────────────
  const breakdown = [
    { label: "Skills Match",      score: skillScore,  max: 50, color: "#4f46e5" },
    { label: "Experience",        score: expScore,    max: 25, color: "#10b981" },
    { label: "Role Alignment",    score: titleScore,  max: 15, color: "#f59e0b" },
    { label: "Profile Completeness", score: softScore, max: 10, color: "#06b6d4" },
  ];

  return { score: totalScore, strengths, gaps, summary, recommendation, breakdown };
}

// ─── ROUTE: POST /api/ai/score-resume ──────────────────────
router.post("/score-resume", async (req, res) => {
  try {
    const { candidate_id, job_description } = req.body;

    if (!candidate_id || !job_description) {
      return res.status(400).json({ success: false, message: "candidate_id and job_description required." });
    }

    if (job_description.trim().length < 30) {
      return res.status(400).json({ success: false, message: "Job description is too short. Please paste the full JD." });
    }

    const [rows] = await db.query(
      "SELECT id, name, position, experience, skills FROM candidates WHERE id = ?",
      [candidate_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Candidate not found." });
    }

    const candidate = rows[0];
    const result = scoreResume(candidate, job_description);

    // Save score to DB
    await db.query("UPDATE candidates SET ai_score = ? WHERE id = ?", [result.score, candidate_id]);

    res.json({ success: true, candidate_name: candidate.name, ...result });
  } catch (err) {
    console.error("AI score error:", err.message);
    res.status(500).json({ success: false, message: "Scoring failed: " + err.message });
  }
});

// ─── GENERATE FEEDBACK REPORT (GenAI - Free) ───────────────
router.post("/generate-report", async (req, res) => {
  try {
    const { candidate_id } = req.body;
    if (!candidate_id) return res.status(400).json({ success: false, message: "candidate_id required." });

    // Fetch candidate + feedback
    const [cRows] = await db.query("SELECT * FROM candidates WHERE id = ?", [candidate_id]);
    if (!cRows.length) return res.status(404).json({ success: false, message: "Candidate not found." });
    const c = cRows[0];

    const [feedbacks] = await db.query(
      "SELECT * FROM feedback WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1",
      [candidate_id]
    );
    if (!feedbacks.length) return res.status(400).json({ success: false, message: "No feedback found for this candidate. Submit feedback first." });
    const fb = feedbacks[0];

    const tech  = fb.technical_score;
    const comm  = fb.communication_score;
    const prob  = fb.problem_solving_score;
    const overall = ((tech + comm + prob) / 3).toFixed(1);
    const reco  = fb.recommendation;

    // ── Rule-based GenAI report ──────────────────────────
    const techLevel  = tech >= 8 ? "exceptional" : tech >= 6 ? "strong" : tech >= 4 ? "moderate" : "limited";
    const commLevel  = comm >= 8 ? "excellent" : comm >= 6 ? "good" : comm >= 4 ? "adequate" : "needs improvement";
    const probLevel  = prob >= 8 ? "outstanding" : prob >= 6 ? "solid" : prob >= 4 ? "satisfactory" : "weak";

    const strengthsList = [];
    const improvList    = [];

    if (tech >= 7) strengthsList.push("strong technical proficiency");
    else improvList.push("deepen technical knowledge");
    if (comm >= 7) strengthsList.push("effective communication skills");
    else improvList.push("improve verbal communication clarity");
    if (prob >= 7) strengthsList.push("excellent analytical thinking");
    else improvList.push("practice structured problem solving");
    if (c.experience >= 3) strengthsList.push(`${c.experience} years of relevant industry experience`);

    const strengthsText = strengthsList.length
      ? `The candidate demonstrated ${strengthsList.join(", ")}.`
      : "The candidate showed basic competencies across evaluated areas.";

    const improvText = improvList.length
      ? `Areas for improvement include: ${improvList.join(", ")}.`
      : "No major improvement areas identified at this stage.";

    const recoMap = {
      "Strong Hire": `Based on the evaluation, ${c.name} is highly recommended for immediate hiring. The overall performance was outstanding across all dimensions.`,
      "Hire":        `${c.name} is a suitable candidate for this role. The performance meets the expected standards and a formal offer is recommended.`,
      "Maybe":       `${c.name} shows potential but has some gaps. A second round of interviews or a probationary offer may be considered.`,
      "No Hire":     `At this stage, ${c.name} does not meet the required benchmarks. The candidate may reapply after gaining more experience.`,
    };

    const report = `INTERVIEW EVALUATION REPORT
===============================
Candidate   : ${c.name}
Position    : ${c.position}
Experience  : ${c.experience || 0} year(s)
Date        : ${new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}

SCORES
------
Technical Skills    : ${tech}/10 (${techLevel})
Communication       : ${comm}/10 (${commLevel})
Problem Solving     : ${prob}/10 (${probLevel})
Overall Score       : ${overall}/10

EVALUATION SUMMARY
------------------
${strengthsText}

${improvText}

${recoMap[reco] || recoMap["Maybe"]}

RECOMMENDATION : ${reco}

REMARKS
-------
${fb.remarks || "No additional remarks provided by the interviewer."}

---
Report generated by InterviewPro AI Evaluation System`;

    res.json({ success: true, report, candidate_name: c.name, overall_score: overall, recommendation: reco });
  } catch (err) {
    console.error("Report generation error:", err.message);
    res.status(500).json({ success: false, message: "Report generation failed." });
  }
});

module.exports = router;
