function toggleParameters() {
    const parameters = document.getElementById('parameters');
    parameters.classList.toggle('show');
}

function loadHistory() {
    fetch('/sessions')
    .then(response => response.json())
    .then(data => {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        data.sessions.forEach(session => {
            const messageText = session.message_count === 1 ? 'message' : 'messages';
            historyList.innerHTML += `
                <div class="history-item">
                    <div class="history-content" onclick="loadSession('${session.session_id}')"> 
                        <div class="history-prompt">${session.first_prompt.substring(0, 40)}...</div>
                        <div class="history-meta">
                            <span class="history-time">${new Date(session.last_timestamp).toLocaleDateString()}</span>
                            <span class="message-count">${session.message_count} ${messageText}</span>
                        </div>
                    </div>
                    <button class="delete-chat-btn" onclick="deleteSession('${session.session_id}')" title="Delete session">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>`;
        });
    });
}

function loadSession(sessionId) {
    currentSessionId = sessionId;
    fetch(`/sessions/${sessionId}`)
    .then(response => response.json())
    .then(data => {
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML = '';
        data.messages.forEach(msg => {
            chatBox.innerHTML += `<div class="message user"><div class="message-content">${msg.prompt}</div></div>`;
            chatBox.innerHTML += `<div class="message bot"><div class="message-content">${msg.response}</div></div>`;
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function deleteSession(sessionId) {
    if (confirm('Delete this entire conversation?')) {
        fetch(`/sessions/${sessionId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                loadHistory();
                if (currentSessionId === sessionId) {
                    clearChat();
                }
            }
        });
    }
}



function updateMemoryStatus() {
    const useMemory = document.getElementById('use-memory').checked;
    const indicator = document.getElementById('memory-indicator');
    indicator.textContent = useMemory ? '🧠 Memory: ON' : '🚫 Memory: OFF';
    indicator.style.color = useMemory ? 'var(--accent-color)' : 'var(--text-muted)';
}

function triggerFileUpload() {
    document.getElementById('document-file').click();
}

let currentSessionId = null;

function clearChat() {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '<div class="empty-state"><h2>NJ\'s Assistant</h2><p>How can I help you today?</p></div>';
    // Generate new session for new chat
    fetch('/session', { method: 'POST' })
    .then(response => response.json())
    .then(data => {
        currentSessionId = data.session_id;
    });
}

function clearAllHistory() {
    if (confirm('Are you sure you want to delete all chat history?')) {
        fetch('/history', { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                loadHistory();
                alert('History cleared successfully');
            }
        });
    }
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const themeText = document.getElementById('theme-text');
    const isLight = document.body.classList.contains('light-mode');
    themeText.textContent = isLight ? 'Dark' : 'Light';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    clearChat();
    loadHistory();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-text').textContent = 'Dark';
    }
    
    // Initialize memory status
    updateMemoryStatus();
    document.getElementById('use-memory').addEventListener('change', updateMemoryStatus);
    
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
    
    const promptInput = document.getElementById('prompt');
    const sendButton = document.getElementById('send-button');
    
    promptInput.addEventListener('input', function() {
        sendButton.disabled = !this.value.trim();
    });
    
    // Initialize first session
    clearChat();
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
    
    chatBox.innerHTML += `<div class="message user"><div class="message-content">${prompt}</div></div>`;
    chatBox.innerHTML += `<div class="message bot"><div class="message-content typing">Thinking...</div></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    const useRag = document.getElementById('use-rag').checked;
    const useMemory = document.getElementById('use-memory').checked;
    
    fetch('/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: prompt,
            session_id: currentSessionId,
            temperature: temperature,
            top_p: topP,
            top_k: topK,
            use_rag: useRag,
            use_memory: useMemory
        })
    })
    .then(response => response.json())
    .then(data => {
        const messages = chatBox.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1];
        lastMessage.textContent = data.response || data.error;
        lastMessage.classList.remove('typing');
        if (data.session_id) {
            currentSessionId = data.session_id;
        }
        loadHistory();
        chatBox.scrollTop = chatBox.scrollHeight;
        promptInput.value = '';
    })
    .catch(() => {
        const messages = chatBox.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1];
        lastMessage.textContent = 'Error occurred';
        lastMessage.classList.remove('typing');
    });
}

function uploadDocument() {
    const fileInput = document.getElementById('document-file');
    const files = fileInput.files;
    if (!files.length) return;
    
    const chatBox = document.getElementById('chat-box');
    const emptyState = chatBox.querySelector('.empty-state');
    if (emptyState) {
        chatBox.innerHTML = '';
    }
    
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    chatBox.innerHTML += `<div class="message user"><div class="message-content">📎 Uploading: ${fileNames}</div></div>`;
    chatBox.innerHTML += `<div class="message bot"><div class="message-content typing">Processing documents...</div></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    
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
        const messages = chatBox.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1];
        lastMessage.textContent = data.message || data.error;
        lastMessage.classList.remove('typing');
        
        if (data.message) {
            fileInput.value = '';
            document.getElementById('use-rag').checked = true;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(() => {
        const messages = chatBox.querySelectorAll('.message-content');
        const lastMessage = messages[messages.length - 1];
        lastMessage.textContent = 'Error uploading documents';
        lastMessage.classList.remove('typing');
    });
}