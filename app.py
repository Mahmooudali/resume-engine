import os
import json
import requests
import subprocess
from flask import Flask, render_template, request, send_file, jsonify

app = Flask(__name__)

# استخراج الـ API Key من متغيرات البيئة
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

def call_gemini(prompt, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 3000,
            "responseMimeType": "application/json"
        }
    }
    
    response = requests.post(url, headers=headers, json=body)
    if response.status_code != 200:
        raise Exception(f"Gemini API Error: {response.text}")
    
    data = response.json()
    return data['candidates'][0]['content']['parts'][0]['text']

def parse_resume_data(text, api_key):
    prompt = f"""
    Extract structured information from the following resume text.
    Return ONLY a JSON object with these keys:
    - name
    - contact (object with phone, email, location, linkedin)
    - summary
    - experience (list of objects with title, company, dates, description)
    - education (list of objects with degree, school, dates)
    - skills (list of strings)
    - languages (list of strings)

    Resume Text:
    {text}
    """
    result = call_gemini(prompt, api_key)
    return json.loads(result.strip())

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        resume_text = request.form.get("resume_text")
        if not resume_text:
            return "Please provide resume text", 400
            
        try:
            # 1. Parse data using Gemini
            resume_data = parse_resume_data(resume_text, GEMINI_API_KEY)
            
            # 2. Save data to temp file for Node script
            with open("temp_data.json", "w", encoding="utf-8") as f:
                json.dump(resume_data, f, ensure_ascii=False)
            
            # 3. Call Node script to generate Word doc
            subprocess.run(["node", "generate_docx.js"], check=True)
            
            # 4. Send the file
            return send_file("output.docx", as_attachment=True, download_name="Resume.docx")
            
        except Exception as e:
            return f"Error: {str(e)}", 500
            
    return render_template("index.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host="0.0.0.0", port=port)
