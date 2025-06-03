document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const sourceLanguage = document.getElementById('source-language');
    const targetLanguage = document.getElementById('target-language');
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-languages');
    const micSourceBtn = document.getElementById('mic-source');
    const clearSourceBtn = document.getElementById('clear-source');
    const copyTargetBtn = document.getElementById('copy-target');
    const speakTargetBtn = document.getElementById('speak-target');
    const charCount = document.querySelector('.char-count');
    const historyContainer = document.querySelector('.history-container');
    const historyList = document.querySelector('.history-list');
    const translationsOptions = document.querySelector('.translations-options');
    const altTranslations = document.querySelector('.alt-translations');

    // Translation history array
    let translationHistory = JSON.parse(localStorage.getItem('translationHistory')) || [];

    // Initialize
    updateCharCount();
    renderHistory();

    // Event Listeners
    sourceText.addEventListener('input', updateCharCount);
    translateBtn.addEventListener('click', translateText);
    swapBtn.addEventListener('click', swapLanguages);
    clearSourceBtn.addEventListener('click', clearSource);
    copyTargetBtn.addEventListener('click', copyToClipboard);
    speakTargetBtn.addEventListener('click', speakText);
    micSourceBtn.addEventListener('click', startSpeechRecognition);

    // Functions
    function updateCharCount() {
        const count = sourceText.value.length;
        charCount.textContent = `${count}/5000`;
    }

    async function translateText() {
        const text = sourceText.value.trim();
        const sourceLang = sourceLanguage.value;
        const targetLang = targetLanguage.value;

        if (!text) {
            alert('Please enter text to translate');
            return;
        }

        try {
            // Show loading state
            targetText.innerHTML = '<div class="loading">Translating...</div>';

            // Using LibreTranslate API (you may need to host your own instance)
            const response = await fetch('https://libretranslate.de/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang === 'auto' ? '' : sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            targetText.textContent = data.translatedText;
            
            // Show alternative translations (mock data - real API would provide this)
            showAlternativeTranslations(text, data.translatedText, sourceLang, targetLang);
            
            // Add to history
            addToHistory(text, data.translatedText, sourceLang, targetLang);
            
        } catch (error) {
            console.error('Translation error:', error);
            targetText.textContent = 'Translation error. Please try again.';
            
            // Fallback to MyMemory API if LibreTranslate fails
            try {
                const fallbackResponse = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
                );
                const fallbackData = await fallbackResponse.json();
                
                if (fallbackData.responseData.translatedText) {
                    targetText.textContent = fallbackData.responseData.translatedText;
                    addToHistory(text, fallbackData.responseData.translatedText, sourceLang, targetLang);
                }
            } catch (fallbackError) {
                console.error('Fallback translation error:', fallbackError);
            }
        }
    }

    function showAlternativeTranslations(sourceText, translatedText, sourceLang, targetLang) {
        // In a real app, this would come from the API
        // Here we're just showing some mock alternatives
        translationsOptions.classList.remove('hidden');
        altTranslations.innerHTML = '';
        
        // Mock alternative translations
        const alternatives = {
            'en-hi': {
                'hello': ['नमस्ते', 'हैलो', 'प्रणाम'],
                'kind': ['दयालु', 'मेहरबान', 'कृपालु'],
                'thank you': ['धन्यवाद', 'शुक्रिया', 'आभार']
            },
            'hi-en': {
                'नमस्ते': ['Hello', 'Hi', 'Greetings'],
                'धन्यवाद': ['Thank you', 'Thanks', 'Much obliged']
            }
        };
        
        const langPair = `${sourceLang}-${targetLang}`;
        const lowerSource = sourceText.toLowerCase();
        
        if (alternatives[langPair] && alternatives[langPair][lowerSource]) {
            alternatives[langPair][lowerSource].forEach(alt => {
                const div = document.createElement('div');
                div.className = 'alt-translation';
                div.textContent = alt;
                div.addEventListener('click', () => {
                    targetText.textContent = alt;
                });
                altTranslations.appendChild(div);
            });
        } else {
            // If no alternatives found, just show the main translation
            const div = document.createElement('div');
            div.className = 'alt-translation';
            div.textContent = translatedText;
            altTranslations.appendChild(div);
        }
    }

    function swapLanguages() {
        const temp = sourceLanguage.value;
        sourceLanguage.value = targetLanguage.value;
        targetLanguage.value = temp;
        
        // Also swap text if there's translation
        if (targetText.textContent.trim()) {
            const tempText = sourceText.value;
            sourceText.value = targetText.textContent;
            targetText.textContent = tempText;
            updateCharCount();
        }
    }

    function clearSource() {
        sourceText.value = '';
        targetText.textContent = '';
        translationsOptions.classList.add('hidden');
        updateCharCount();
    }

    function copyToClipboard() {
        if (!targetText.textContent.trim()) return;
        
        navigator.clipboard.writeText(targetText.textContent)
            .then(() => {
                const originalText = copyTargetBtn.innerHTML;
                copyTargetBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyTargetBtn.innerHTML = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
            });
    }

    function speakText() {
        if (!targetText.textContent.trim()) return;
        
        const utterance = new SpeechSynthesisUtterance(targetText.textContent);
        utterance.lang = targetLanguage.value;
        speechSynthesis.speak(utterance);
    }

    function startSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.lang = sourceLanguage.value === 'auto' ? 'en-US' : `${sourceLanguage.value}-${sourceLanguage.value.toUpperCase()}`;
            recognition.interimResults = false;
            
            recognition.onstart = () => {
                micSourceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                sourceText.placeholder = 'Listening...';
            };
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                sourceText.value = transcript;
                updateCharCount();
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                micSourceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                sourceText.placeholder = 'Enter text';
            };
            
            recognition.onend = () => {
                micSourceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                sourceText.placeholder = 'Enter text';
            };
            
            recognition.start();
        } else {
            alert('Speech recognition not supported in your browser');
        }
    }

    function addToHistory(sourceText, translatedText, sourceLang, targetLang) {
        // Check if this translation already exists in history
        const exists = translationHistory.some(item => 
            item.sourceText === sourceText && 
            item.sourceLang === sourceLang && 
            item.targetLang === targetLang
        );
        
        if (!exists) {
            translationHistory.unshift({
                sourceText,
                translatedText,
                sourceLang,
                targetLang,
                timestamp: new Date().toISOString()
            });
            
            // Keep only the last 50 items
            if (translationHistory.length > 50) {
                translationHistory.pop();
            }
            
            localStorage.setItem('translationHistory', JSON.stringify(translationHistory));
            renderHistory();
        }
    }

    function renderHistory() {
        if (translationHistory.length > 0) {
            historyContainer.classList.remove('hidden');
            historyList.innerHTML = '';
            
            translationHistory.forEach((item, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                historyItem.innerHTML = `
                    <div>
                        <strong>${item.sourceText.substring(0, 30)}${item.sourceText.length > 30 ? '...' : ''}</strong>
                        <div class="lang-pair">${getLanguageName(item.sourceLang)} → ${getLanguageName(item.targetLang)}</div>
                    </div>
                    <div>${item.translatedText.substring(0, 30)}${item.translatedText.length > 30 ? '...' : ''}</div>
                `;
                
                historyItem.addEventListener('click', () => {
                    sourceLanguage.value = item.sourceLang;
                    targetLanguage.value = item.targetLang;
                    sourceText.value = item.sourceText;
                    targetText.textContent = item.translatedText;
                    updateCharCount();
                    translationsOptions.classList.add('hidden');
                });
                
                historyList.appendChild(historyItem);
            });
        } else {
            historyContainer.classList.add('hidden');
        }
    }

    function getLanguageName(code) {
        const languages = {
            'auto': 'Detect',
            'en': 'English',
            'hi': 'Hindi',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ar': 'Arabic'
        };
        return languages[code] || code;
    }
});
