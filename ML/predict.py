"""
predict.py — Called by Node.js backend
Usage: python predict.py <exp> <tech> <comm> <prob> <interviews> <edu> <prev_comp> <skills>
Output: JSON with label, probability, category
"""
import sys
import json
import os
import numpy as np

def predict(features):
    try:
        import joblib
        model_path = os.path.join(os.path.dirname(__file__), 'random_forest_model.pkl')
        model = joblib.load(model_path)
        arr = np.array([features])
        prob = model.predict_proba(arr)[0][1]
    except Exception as e:
        # Fallback rule-based if model not trained yet
        exp, tech, comm, prob_solve, interviews, edu, prev, skills = features
        score = (tech * 0.3 + comm * 0.2 + prob_solve * 0.25 + min(exp, 10) * 0.5 + skills * 0.3)
        prob = min(score / 15.0, 1.0)

    prob_pct = round(prob * 100, 1)

    if prob >= 0.70:
        label    = "Highly Likely to Select"
        category = "high"
        color    = "green"
    elif prob >= 0.40:
        label    = "Moderately Likely to Select"
        category = "medium"
        color    = "amber"
    else:
        label    = "Low Selection Probability"
        category = "low"
        color    = "red"

    result = {
        "label":       label,
        "probability": prob_pct,
        "category":    category,
        "color":       color,
        "features_used": {
            "years_experience":       features[0],
            "technical_score":        features[1],
            "communication_score":    features[2],
            "problem_solving_score":  features[3],
            "num_interviews":         features[4],
            "education_level":        features[5],
            "previous_companies":     features[6],
            "skills_count":           features[7],
        }
    }
    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) < 9:
        print(json.dumps({"error": "Need 8 feature arguments"}))
        sys.exit(1)

    try:
        features = [float(x) for x in sys.argv[1:9]]
        predict(features)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
