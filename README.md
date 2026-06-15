# InterviewPro — AI-Enhanced Interview Management System

> A full-stack Applicant Tracking System (ATS) with Machine Learning candidate prediction and Generative AI evaluation reports powered by Groq Llama 3.1.

---

## 🌐 Live Demo

| **Frontend** | https://interviewpro-ats.onrender.com |
| **Backend API** | https://ai-interview-management-system.onrender.com |
| **API Health** | https://ai-interview-management-system.onrender.com/api/health |
| **GitHub** | https://github.com/BVarunReddy/ai-interview-management-system |

**Demo Login:**
- Email: `admin@interviewpro.com`
- Password: `Admin@123`

---

## 📋 Project Overview

InterviewPro is a recruitment management platform that helps organizations manage their entire hiring process from candidate registration to final hiring decision.

### System Modules

#### 1. Interview Management System (Full Stack)
- Candidate Registration & Login
- Recruiter/Admin Login with JWT Authentication
- Interview Scheduling & Round Management
- Candidate Status Tracking (Pipeline)
- Interview Feedback Submission
- Notification & Interview Dashboard
- Recruitment Reports & Analytics

#### 2. Machine Learning Module
- **Algorithm:** Random Forest Classifier
- **Task:** Candidate Selection Prediction
- **Output:** Highly Likely / Moderately Likely / Low Selection Probability
- **Input Features:** Experience, Technical Score, Communication, Problem Solving, Skills Count
- **Accuracy:** 90%+

#### 3. Generative AI Module
- **LLM:** Groq API — Meta Llama 3.1
- **Task:** Interview Feedback & Evaluation Report Generator
- **Output:** Executive Summary, Technical Assessment, Strengths, Areas for Improvement, Final Recommendation

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL 8.0 |
| **Authentication** | JWT + bcrypt |
| **ML Module** | Python 3, scikit-learn (Random Forest) |
| **GenAI Module** | Groq API — Llama 3.1-8b-instant |
| **File Upload** | Multer |
| **Charts** | Chart.js |
| **Deployment** | Render (Frontend + Backend), Railway (MySQL) |

---

## 📁 Project Structure

```
AI-Interview-System/
│
├── Frontend/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── addCandidate.html
│   ├── viewCandidates.html
│   ├── scheduleInterview.html
│   ├── viewInterviews.html
│   ├── feedback.html
│   ├── analytics.html
│   ├── aiScore.html
│   ├── mlPredict.html
│   ├── profile.html
│   ├── css/
│   │   └── app.css
│   └── js/
│       ├── api.js
│       ├── toast.js
│       ├── dashboard.js
│       ├── candidate.js
│       ├── viewCandidates.js
│       ├── interview.js
│       ├── viewInterviews.js
│       ├── feedback.js
│       ├── analytics.js
│       ├── aiScore.js
│       ├── mlPredict.js
│       └── profile.js
│
├── Backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── schema.sql
│   ├── .env.example
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── candidates.js
│   │   ├── interviews.js
│   │   ├── feedback.js
│   │   ├── dashboard.js
│   │   ├── ai.js
│   │   ├── ml.js
│   │   └── notifications.js
│   └── uploads/
│
└── ML/
    ├── train_model.ipynb
    ├── recruitment_dataset.csv
    ├── predict.py
    ├── random_forest_model.pkl
    ├── feature_names.pkl
    └── model_accuracy_report.txt
```

---

## ⚙️ Setup Instructions

### Prerequisites

```bash
node --version    # v18 or higher
npm --version     # v8 or higher
mysql --version   # v8.0 or higher
python --version  # v3.8 or higher
pip --version
```

### Step 1 — Clone the Repository

```bash
git clone https://github.com/BVarunReddy/ai-interview-management-system.git
cd ai-interview-management-system
```

### Step 2 — Database Setup

Open MySQL Workbench and run each SQL file:

```sql
-- 1. Create tables
source Backend/schema.sql;

-- 2. Add notifications table
source Backend/notifications_table.sql;

-- 3. Add ML columns
source Backend/ml_columns.sql;
```

### Step 3 — Configure Environment

```bash
cd Backend
cp .env.example .env
```

Edit `.env` with your values:


### Step 4 — Install Backend Dependencies

```bash
cd Backend
npm install
```

### Step 5 — Train the ML Model

```bash
pip install scikit-learn pandas numpy matplotlib seaborn joblib

# Open Jupyter Notebook
jupyter notebook ML/train_model.ipynb
```

Run all cells. This generates:
- `ML/random_forest_model.pkl`
- `ML/feature_names.pkl`
- `ML/model_accuracy_report.txt`

---

## 🚀 Steps to Run

### Start Backend

```bash
cd Backend
npm run dev
```

Expected output:
```
✅ MySQL Connected
🚀 InterviewPro Server v2.0
   Running on port: 3000
   Environment: production
```

### Open Frontend

Open `Frontend/login.html` in your browser.

**Login with:**
- Email: `admin@interviewpro.com`
- Password: `Admin@123`

Or register a new account at `Frontend/register.html`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get profile |
| GET | `/api/candidates` | Get all candidates |
| POST | `/api/candidates` | Add candidate |
| PUT | `/api/candidates/:id/status` | Update status |
| DELETE | `/api/candidates/:id` | Delete candidate |
| GET | `/api/interviews` | Get all interviews |
| POST | `/api/interviews` | Schedule interview |
| PUT | `/api/interviews/:id/status` | Update interview |
| GET | `/api/feedback` | Get all feedback |
| POST | `/api/feedback` | Submit feedback |
| GET | `/api/dashboard/stats` | Dashboard stats |
| POST | `/api/ai/score-resume` | AI resume scoring |
| POST | `/api/ai/generate-report` | GenAI evaluation report |
| POST | `/api/ml/predict` | ML prediction |
| GET | `/api/notifications` | Get notifications |
| GET | `/api/health` | Health check |

---

## 🤖 ML Model Details

| Property | Value |
|---|---|
| Algorithm | Random Forest Classifier |
| Trees | 100 estimators |
| Training Samples | 80 |
| Test Samples | 20 |
| Accuracy | 90%+ |
| Output Classes | Highly Likely / Moderately Likely / Low |

**Input Features:**
1. Years of Experience
2. Technical Assessment Score
3. Communication Rating
4. Problem Solving Score
5. Number of Interviews
6. Education Level
7. Previous Companies
8. Skills Count

---

## 🧠 GenAI Module Details

| Property | Value |
|---|---|
| Provider | Groq |
| Model | Llama 3.1-8b-instant |
| Task | Interview Evaluation Report |
| Cost | Free |

**Report Sections:**
1. Executive Summary
2. Technical Assessment
3. Communication & Soft Skills
4. Problem Solving Assessment
5. Strengths
6. Areas for Improvement
7. Final Recommendation

---

## 📊 Database Schema

```
users         — id, name, email, password, role, department
candidates    — id, name, email, position, experience, skills, status, ai_score, ml_prediction
interviews    — id, candidate_id, interviewer, round_name, date, time, status
feedback      — id, candidate_id, technical_score, communication_score, problem_solving_score, recommendation
notifications — id, title, message, type, is_read, user_id
```

---

## ✅ Key Features

- JWT Authentication with bcrypt password hashing
- Candidate pipeline with 6 stages
- Resume upload (PDF/DOC/DOCX)
- Real-time notification system
- AI Resume Scoring (0-100 scale)
- ML Candidate Prediction (Random Forest)
- GenAI Evaluation Reports (Groq Llama 3.1)
- Analytics dashboard with 4 chart types
- Mobile responsive design
- Modular Express.js routing

---

