const textInput = document.getElementById('textInput');
const languageSelect = document.getElementById('languageSelect');
const voiceSelect = document.getElementById('voiceSelect');
const genderSelect = document.getElementById('genderSelect');
const typeSelect = document.getElementById('typeSelect');
const rate = document.getElementById('rate');
const pitch = document.getElementById('pitch');
const volume = document.getElementById('volume');
const rateValue = document.getElementById('rateValue');
const pitchValue = document.getElementById('pitchValue');
const volumeValue = document.getElementById('volumeValue');
const testVoiceBtn = document.getElementById('testVoiceBtn');
const previewBtn = document.getElementById('previewBtn');
const speakBtn = document.getElementById('speakBtn');
const downloadBtn = document.getElementById('downloadBtn');
const savePromptBtn = document.getElementById('savePromptBtn');
const loadPromptBtn = document.getElementById('loadPromptBtn');
const promptList = document.getElementById('promptList');
const historyList = document.getElementById('historyList');
const notification = document.getElementById('notification');

let voices = [];
let lastSpokenConfig = null;
let savedPrompts = JSON.parse(localStorage.getItem('ttsPrompts')) || [];
let history = JSON.parse(localStorage.getItem('ttsHistory')) || [];

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

function fetchVoices() {
    voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
        speechSynthesis.onvoiceschanged = () => {
            voices = speechSynthesis.getVoices();
            populateLanguages();
            if (voices.length === 0) {
                showNotification('No voices available. Check system settings.', 'error');
            }
        };
    } else {
        populateLanguages();
    }
}

function inferVoiceMetadata(voice) {
    const name = voice.name.toLowerCase();
    let gender = '';
    let type = 'standard';

    // Infer gender from common voice names
    if (name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('susan')) {
        gender = 'female';
    } else if (name.includes('male') || name.includes('david') || name.includes('mark') || name.includes('alex')) {
        gender = 'male';
    }

    // Infer type (e.g., enhanced for Google, Microsoft voices)
    if (name.includes('google') || name.includes('microsoft') || name.includes('natural')) {
        type = 'enhanced';
    }

    return { gender, type };
}

function populateLanguages() {
    const uniqueLanguages = [...new Set(voices.map(voice => voice.lang))].sort();
    languageSelect.innerHTML = '<option value="">Select Language</option>';
    uniqueLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        languageSelect.appendChild(option);
    });
    updateVoiceSelect();
}

function updateVoiceSelect() {
    const selectedLang = languageSelect.value;
    const selectedGender = genderSelect.value;
    const selectedType = typeSelect.value;

    voiceSelect.innerHTML = '<option value="">Select Voice</option>';
    voices
        .filter(voice => !selectedLang || voice.lang === selectedLang)
        .filter(voice => {
            const metadata = inferVoiceMetadata(voice);
            return !selectedGender || metadata.gender === selectedGender;
        })
        .filter(voice => {
            const metadata = inferVoiceMetadata(voice);
            return !selectedType || metadata.type === selectedType;
        })
        .forEach(voice => {
            const metadata = inferVoiceMetadata(voice);
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${metadata.gender || 'Unknown'}, ${metadata.type})`;
            voiceSelect.appendChild(option);
        });

    if (voiceSelect.options.length === 1) {
        showNotification('No voices match the selected filters.', 'error');
    }
}

function createUtterance(text) {
    if (!text.trim()) {
        showNotification('Please enter some text.', 'error');
        return null;
    }
    if (!languageSelect.value || !voiceSelect.value) {
        showNotification('Please select a language and voice.', 'error');
        return null;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
    if (!selectedVoice) {
        showNotification('Selected voice not found.', 'error');
        return null;
    }

    utterance.voice = selectedVoice;
    utterance.lang = languageSelect.value;
    utterance.rate = parseFloat(rate.value);
    utterance.pitch = parseFloat(pitch.value);
    utterance.volume = parseFloat(volume.value);
    return utterance;
}

function testVoice() {
    const utterance = createUtterance('This is a test of the selected voice.');
    if (utterance) {
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
        showNotification('Testing voice.');
    }
}

function preview() {
    const utterance = createUtterance(textInput.value.slice(0, 50));
    if (utterance) {
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
        showNotification('Previewing text.');
    }
}

function speak() {
    const utterance = createUtterance(textInput.value);
    if (utterance) {
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
        lastSpokenConfig = {
            text: textInput.value,
            language: languageSelect.value,
            voice: voiceSelect.value,
            rate: rate.value,
            pitch: pitch.value,
            volume: volume.value
        };
        downloadBtn.disabled = false;
        addToHistory(textInput.value);
        showNotification('Speaking text.');
    }
}

function downloadConfig() {
    if (!lastSpokenConfig) {
        showNotification('No TTS configuration to download.', 'error');
        return;
    }

    const configText = `
Text: ${lastSpokenConfig.text}
Language: ${lastSpokenConfig.language}
Voice: ${lastSpokenConfig.voice}
Rate: ${lastSpokenConfig.rate}
Pitch: ${lastSpokenConfig.pitch}
Volume: ${lastSpokenConfig.volume}

To convert to MP3, use a TTS tool like eSpeak or an online service.
For eSpeak, run: espeak -f this_file.txt -w output.mp3
For online tools, copy the text above and adjust settings as needed.
    `.trim();

    const blob = new Blob([configText], { type: 'text/plain' });
    saveAs(blob, 'tts_config.txt');
    showNotification('Config downloaded.');
}

function savePrompt() {
    const prompt = textInput.value.trim();
    if (!prompt) {
        showNotification('Please enter a prompt to save.', 'error');
        return;
    }
    savedPrompts.push(prompt);
    localStorage.setItem('ttsPrompts', JSON.stringify(savedPrompts));
    renderPrompts();
    showNotification('Prompt saved.');
}

function renderPrompts() {
    promptList.innerHTML = '';
    savedPrompts.forEach((prompt, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}</span>
            <div>
                <button onclick="loadPrompt(${index})">Load</button>
                <button onclick="deletePrompt(${index})">Delete</button>
            </div>
        `;
        promptList.appendChild(li);
    });
}

function loadPrompt(index) {
    textInput.value = savedPrompts[index];
    showNotification('Prompt loaded.');
}

function deletePrompt(index) {
    savedPrompts.splice(index, 1);
    localStorage.setItem('ttsPrompts', JSON.stringify(savedPrompts));
    renderPrompts();
    showNotification('Prompt deleted.');
}

function addToHistory(text) {
    if (text.trim()) {
        history.unshift(text);
        if (history.length > 10) history.pop();
        localStorage.setItem('ttsHistory', JSON.stringify(history));
        renderHistory();
    }
}

function renderHistory() {
    historyList.innerHTML = '';
    history.forEach((text, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${text.substring(0, 50)}${text.length > 50 ? '...' : ''}</span>
            <button onclick="loadHistory(${index})">Load</button>
        `;
        historyList.appendChild(li);
    });
}

function loadHistory(index) {
    textInput.value = history[index];
    showNotification('History item loaded.');
}

// Event listeners
languageSelect.addEventListener('change', updateVoiceSelect);
genderSelect.addEventListener('change', updateVoiceSelect);
typeSelect.addEventListener('change', updateVoiceSelect);
testVoiceBtn.addEventListener('click', testVoice);
previewBtn.addEventListener('click', preview);
speakBtn.addEventListener('click', speak);
downloadBtn.addEventListener('click', downloadConfig);
savePromptBtn.addEventListener('click', savePrompt);
loadPromptBtn.addEventListener('click', () => {
    promptList.style.display = promptList.style.display === 'none' ? 'block' : 'none';
    showNotification(promptList.style.display === 'block' ? 'Prompts shown.' : 'Prompts hidden.');
});

rate.addEventListener('input', () => rateValue.textContent = rate.value);
pitch.addEventListener('input', () => pitchValue.textContent = pitch.value);
volume.addEventListener('input', () => volumeValue.textContent = volume.value);

// Initialize
fetchVoices();
renderPrompts();
renderHistory();