import config
from flask import Flask, request, jsonify, render_template
import os
from llm_service import query_llm
from rag_service import rag_service
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_document():
    files = request.files.getlist('files')
    
    if not files:
        return jsonify({'error': 'No files provided'}), 400
    
    try:
        for file in files:
            if file.filename:
                text = file.read().decode('utf-8')
                metadata = {'filename': file.filename}
                rag_service.add_document(text, metadata)
        return jsonify({'message': f'{len(files)} file(s) uploaded successfully'})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    prompt = data.get('prompt')
    temperature = data.get('temperature', 0.7)
    top_p = data.get('top_p', 0.9)
    top_k = data.get('top_k', 50)
    use_rag = data.get('use_rag', False)

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    try:
        context = None
        if use_rag:
            context = rag_service.get_context(prompt)
        
        response = query_llm(prompt, temperature, top_p, top_k, context)
        return jsonify({'response': response})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,port=5000,host="0.0.0.0")
