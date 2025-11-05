import config
from flask import Flask, request, jsonify, render_template
import os
from llm_service import query_llm
from rag_service import rag_service
from db_service import db_service
from file_service import file_service
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
        uploaded_files = []
        for file in files:
            if file.filename:
                # Save file
                file_info = file_service.save_file(file)
                
                # Extract text based on file type
                text = file_service.extract_text(file_info['filepath'], file_info['type'])
                
                if text and file_info['type'] != 'image':
                    metadata = {
                        'filename': file_info['original_name'],
                        'type': file_info['type'],
                        'size': file_info['size']
                    }
                    rag_service.add_document(text, metadata)
                
                uploaded_files.append(file_info['original_name'])
        
        return jsonify({
            'message': f'{len(uploaded_files)} file(s) uploaded and processed successfully',
            'files': uploaded_files
        })
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/files', methods=['GET'])
def list_files():
    try:
        files = file_service.list_files()
        return jsonify({'files': files})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    try:
        if file_service.delete_file(filename):
            return jsonify({'message': 'File deleted successfully'})
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/sessions', methods=['GET'])
def get_sessions():
    try:
        sessions = db_service.get_sessions()
        return jsonify({'sessions': sessions})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/sessions/<session_id>', methods=['GET'])
def get_session_messages(session_id):
    try:
        messages = db_service.get_session_messages(session_id)
        return jsonify({'messages': messages})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['DELETE'])
def clear_history():
    try:
        db_service.clear_history()
        return jsonify({'message': 'History cleared successfully'})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    try:
        db_service.delete_session(session_id)
        return jsonify({'message': 'Session deleted successfully'})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/session', methods=['POST'])
def new_session():
    try:
        session_id = db_service.generate_session_id()
        return jsonify({'session_id': session_id})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    prompt = data.get('prompt')
    session_id = data.get('session_id')
    temperature = data.get('temperature', 0.7)
    top_p = data.get('top_p', 0.9)
    top_k = data.get('top_k', 50)
    use_rag = data.get('use_rag', False)
    use_memory = data.get('use_memory', True)

    if not prompt:
        return jsonify({'error': 'Prompt is required'}), 400
    
    if not session_id:
        session_id = db_service.generate_session_id()

    try:
        context = None
        if use_rag:
            context = rag_service.get_context(prompt)
        
        # Build conversation context for memory
        conversation_context = ""
        if use_memory and session_id:
            chat_history = db_service.get_session_context(session_id)
            if chat_history:
                conversation_context = "Previous conversation:\n"
                for chat in chat_history:
                    conversation_context += f"Human: {chat['prompt']}\nAssistant: {chat['response']}\n"
                conversation_context += "\nCurrent question: "
        
        # Combine contexts
        full_prompt = conversation_context + prompt if conversation_context else prompt
        
        response = query_llm(full_prompt, temperature, top_p, top_k, context)
        
        # Save to database
        metadata = {'temperature': temperature, 'top_p': top_p, 'top_k': top_k, 'use_rag': use_rag, 'use_memory': use_memory}
        db_service.save_chat(prompt, response, session_id, metadata)
        
        return jsonify({'response': response, 'session_id': session_id})
    except Exception as e:
        logging.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,port=5000,host="0.0.0.0")
