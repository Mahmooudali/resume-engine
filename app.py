from flask import Flask, request, jsonify, send_file, send_from_directory
import requests
import json
import os
import subprocess
import tempfile
import time

app = Flask(__name__, static_folder='static')

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
def call_gemini(prompt, api_key=None, max_retries=4):
    key = api_key or GEMINI_API_KEY
    headers = {"Content-Type": "application/json"}
    params = {"key": key}
    
    # تحديد شكل الـ JSON المطلوب (Schema) لضمان عدم حدوث أي أخطاء في التحليل
    schema = {
        "type": "OBJECT",
        "properties": {
            "name": {"type": "STRING"},
            "title": {"type": "STRING"},
            "email": {"type": "STRING"},
            "phone": {"type": "STRING"},
            "location": {"type": "STRING"},
            "linkedin": {"type": "STRING"},
            "summary": {"type": "STRING"},
            "experience": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "company": {"type": "STRING"},
                        "role": {"type": "STRING"},
                        "period": {"type": "STRING"},
                        "bullets": {"type": "ARRAY", "items": {"type": "STRING"}}
                    }
                }
            },
            "education": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "institution": {"type": "STRING"},
                        "degree": {"type": "STRING"},
                        "year": {"type": "STRING"}
                    }
                }
            },
            "skills": {"type": "ARRAY", "items": {"type": "STRING"}},
            "languages": {"type": "ARRAY", "items": {"type": "STRING"}}
        }
    }

    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2, 
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
            "responseSchema": schema # إجبار الـ API على الالتزام بهذا الشكل
        }
    }
    for attempt in range(max_retries):
        resp = requests.post(GEMINI_URL, headers=headers, params=params, json=body, timeout=60)
        if resp.status_code == 429:
            wait_time = 2 ** attempt
            print(f"Rate limit hit. Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
            continue
        if resp.status_code != 200:
            print(f"Error response: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    raise Exception("فشل الاتصال بالـ API بعد عدة محاولات")

def parse_resume_data(raw_text, lang, api_key=None):
    lang_instruction = "in Arabic" if lang == "ar" else "in English"
    prompt = f"""You are a professional CV writer. Extract and enhance the following raw resume text.
Rewrite all bullet points using strong Action Verbs {lang_instruction}.
Make descriptions concise and ATS-friendly.

Raw text to process:
{raw_text}"""
    
    result = call_gemini(prompt, api_key)
    
    # تنظيف بسيط احتياطي، مع أن الـ Schema بتضمن JSON سليم
    result = result.strip()
    if result.startswith("```"):
        result = result.split("```")[1]
        if result.startswith("json"):
            result = result[4:]
    
    return json.loads(result.strip())

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/generate", methods=["POST"])
def generate():
    data = request.json
    raw_text = data.get("text", "").strip()
    template = data.get("template", "en_modern")
    api_key = data.get("api_key", "") or GEMINI_API_KEY
    lang = "ar" if template.startswith("ar") else "en"

    if not raw_text:
        return jsonify({"error": "الرجاء إدخال نص السيرة الذاتية"}), 400
    if not api_key:
        return jsonify({"error": "API Key غير موجود"}), 400

    try:
        resume_data = parse_resume_data(raw_text, lang, api_key)
    except Exception as e:
        return jsonify({"error": f"خطأ في تحليل النص: {str(e)}"}), 500

    try:
        output_path = generate_docx(resume_data, template)
    except Exception as e:
        return jsonify({"error": f"خطأ في إنشاء الملف: {str(e)}"}), 500

    return send_file(output_path, as_attachment=True,
                     download_name=f"CV_{resume_data.get('name','Resume').replace(' ','_')}.docx",
                     mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

def generate_docx(data, template):
    script_path = os.path.join(os.path.dirname(__file__), "templates", f"{template}.js")
    data_json = json.dumps(data, ensure_ascii=False)
    out_path = os.path.join(tempfile.mkdtemp(), "output.docx")
    result = subprocess.run(
        ["node", script_path, data_json, out_path],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        raise Exception(result.stderr or result.stdout)
    return out_path

@app.route("/preview", methods=["POST"])
def preview():
    data = request.json
    raw_text = data.get("text", "").strip()
    template = data.get("template", "en_modern")
    api_key = data.get("api_key", "") or GEMINI_API_KEY
    lang = "ar" if template.startswith("ar") else "en"

    if not raw_text:
        return jsonify({"error": "الرجاء إدخال نص"}), 400

    try:
        resume_data = parse_resume_data(raw_text, lang, api_key)
        return jsonify({"success": True, "data": resume_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Resume Engine شغال على: http://localhost:5000")
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)