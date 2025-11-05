function toggleParameters() {
    const parameters = document.getElementById('parameters');
    const ragControls = document.getElementById('rag-controls');
    parameters.classList.toggle('show');
    ragControls.classList.remove('show');
}

function triggerFileUpload() {
    document.getElementById('document-file').click();
}

function clearChat() {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '<div class="empty-state"><h2>🤖 AI Assistant</h2><p>Start a conversation by typing a message below</p></div>';
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    clearChat();
    
    document.getElementById('temperature').oninput = function() {
        document.getElementById('temp-value').textContent = this.value;
    };
    document.getElementById('top-p').oninput = function() {
        document.getElementById('top-p-value').textContent = this.value;
    };
    document.getElementById('top-k').oninput = function() {
        document.getElementById('top-k-value').textContent = this.value;
    };
    
    document.getElementById('document-file').onchange = function() {
        if (this.files.length > 0) {
            uploadDocument();
        }
    };
});

function sendMessage() {
    const promptInput = document.getElementById('prompt');
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    const temperature = parseFloat(document.getElementById('temperature').value);
    const topP = parseFloat(document.getElementById('top-p').value);
    const topK = parseInt(document.getElementById('top-k').value);

    const chatBox = document.getElementById('chat-box');
    
    // Remove empty state if it exists
    const emptyState = chatBox.querySelector('.empty-state');
    if (emptyState) {
        chatBox.innerHTML = '';
    }
    
    chatBox.innerHTML += `<div class="message user">${prompt}</div>`;
    chatBox.innerHTML += `<div class="message bot typing">Thinking...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    const useRag = document.getElementById('use-rag').checked;
    
    fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: prompt,
            temperature: temperature,
            top_p: topP,
            top_k: topK,
            use_rag: useRag
        })
    })
    .then(response => response.json())
    .then(data => {
        const messages = chatBox.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        lastMessage.textContent = data.response || data.error;
        lastMessage.classList.remove('typing');
        chatBox.scrollTop = chatBox.scrollHeight;
        promptInput.value = '';
    })
    .catch(() => {
        const messages = chatBox.querySelectorAll('.message');
        const lastMessage = messages[messages.length - 1];
        lastMessage.textContent = 'Error occurred';
        lastMessage.classList.remove('typing');
    });
}

function uploadDocument() {
    const fileInput = document.getElementById('document-file');
    const files = fileInput.files;
    if (!files.length) return;
    
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message || data.error);
        if (data.message) {
            fileInput.value = '';
            document.getElementById('use-rag').checked = true;
        }
    });
}