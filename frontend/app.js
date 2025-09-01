// Simple frontend application logic
class BlueskyLangApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isAuthenticated = false;
        this.sessionId = localStorage.getItem('sessionId') || null;
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentFeedType = 'my'; // 'my' or 'following'
        this.currentWordsFilter = 'all'; // Current words filter
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Refresh posts button
        const refreshPostsBtn = document.getElementById('refreshPostsBtn');
        if (refreshPostsBtn) {
            refreshPostsBtn.addEventListener('click', () => {
                this.loadPosts();
            });
        }

        // Posts limit change
        const postsLimit = document.getElementById('postsLimit');
        if (postsLimit) {
            postsLimit.addEventListener('change', () => {
                this.loadPosts();
            });
        }

        // Refresh words button
        const refreshWordsBtn = document.getElementById('refreshWordsBtn');
        if (refreshWordsBtn) {
            refreshWordsBtn.addEventListener('click', () => {
                this.loadWords();
            });
        }

        // Refresh progress button
        const refreshProgressBtn = document.getElementById('refreshProgressBtn');
        if (refreshProgressBtn) {
            refreshProgressBtn.addEventListener('click', () => {
                this.loadProgressData();
            });
        }



        // Words sort change
        const wordsSort = document.getElementById('wordsSort');
        if (wordsSort) {
            wordsSort.addEventListener('change', () => {
                this.filterWords();
            });
        }

        // Quiz event listeners
        this.setupQuizEventListeners();

        // Feed tabs
        const feedTabs = document.querySelectorAll('.feed-tab');
        feedTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const feedType = e.target.dataset.feed;
                if (feedType) {
                    this.switchFeedType(feedType);
                }
            });
        });
    }

    switchFeedType(feedType) {
        // Update active tab
        const feedTabs = document.querySelectorAll('.feed-tab');
        feedTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.feed === feedType) {
                tab.classList.add('active');
            }
        });

        // Store current feed type
        this.currentFeedType = feedType;
        
        // Reload posts with new feed type
        this.loadPosts();
    }

    navigateToPage(pageName) {
        // Check if authentication is required for this page
        const protectedPages = ['dashboard', 'posts', 'words', 'learning', 'progress'];
        
        if (protectedPages.includes(pageName) && !this.isAuthenticated) {
            this.showMessage('ログインが必要です', 'warning');
            this.showPage('login');
            return;
        }

        this.showPage(pageName);
    }

    showPage(pageName) {
        // Clear any existing messages when changing pages
        this.clearMessage();
        
        // Hide all page sections
        const sections = document.querySelectorAll('.page-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected page
        const targetSection = document.getElementById(`${pageName}Page`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation visibility
        const nav = document.querySelector('.nav');
        if (nav) {
            if (pageName === 'login') {
                nav.style.display = 'none';
            } else {
                nav.style.display = 'block';
            }
        }

        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageName) {
                item.classList.add('active');
            }
        });

        this.currentPage = pageName;

        // Load page-specific data
        if (pageName === 'posts' && this.isAuthenticated) {
            this.loadPosts();
        } else if (pageName === 'words' && this.isAuthenticated) {
            this.loadWords();
        } else if (pageName === 'learning' && this.isAuthenticated) {
            this.loadLearningStats();
        } else if (pageName === 'progress' && this.isAuthenticated) {
            this.loadProgressData();
        }
    }

    async checkAuthStatus() {
        try {
            if (!this.sessionId) {
                this.showPage('login');
                return;
            }

            const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionId}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    this.isAuthenticated = true;
                    this.showPage('dashboard');
                } else {
                    this.clearSession();
                    this.showPage('login');
                }
            } else {
                this.clearSession();
                this.showPage('login');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.clearSession();
            this.showPage('login');
        }
    }

    async handleLogin() {
        const blueskyId = document.getElementById('blueskyId').value.trim();
        const appPassword = document.getElementById('appPassword').value.trim();

        if (!blueskyId || !appPassword) {
            this.showMessage('すべてのフィールドを入力してください', 'error');
            return;
        }

        this.showLoading('loginBtn', true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: blueskyId,
                    password: appPassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.sessionId = data.sessionId;
                localStorage.setItem('sessionId', this.sessionId);
                
                // Store user identifier for posts API
                if (data.user && data.user.identifier) {
                    localStorage.setItem('userIdentifier', data.user.identifier);
                }
                
                this.isAuthenticated = true;
                
                // Clear form
                document.getElementById('blueskyId').value = '';
                document.getElementById('appPassword').value = '';
                
                // Show success message and transition
                this.showMessage('ログインに成功しました！', 'success');
                setTimeout(() => {
                    this.clearMessage();
                    this.showPage('dashboard');
                    // Show welcome message on dashboard
                    setTimeout(() => {
                        this.showMessage('ダッシュボードへようこそ！', 'success');
                    }, 100);
                }, 1000);
            } else {
                this.showMessage(data.message || 'ログインに失敗しました。認証情報を確認してください。', 'error');
            }
        } catch (error) {
            console.error('Login failed:', error);
            this.showMessage('サーバーに接続できませんでした。しばらく後でお試しください。', 'error');
        } finally {
            this.showLoading('loginBtn', false);
        }
    }

    async handleLogout() {
        try {
            if (this.sessionId) {
                await fetch(`${this.apiBaseUrl}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.sessionId}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            this.clearSession();
            this.showMessage('ログアウトしました', 'info');
            setTimeout(() => {
                this.clearMessage();
                this.showPage('login');
            }, 1000);
        }
    }

    clearSession() {
        this.sessionId = null;
        this.isAuthenticated = false;
        localStorage.removeItem('sessionId');
        localStorage.removeItem('userIdentifier');
        // Note: We don't remove 'savedWords' here to preserve user's vocabulary data
        // savedWords should persist across login sessions
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;

        messageContainer.innerHTML = `
            <div class="status-message status-${type}">
                ${message}
            </div>
        `;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.clearMessage();
        }, 5000);
    }

    clearMessage() {
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
    }

    showLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="loading-spinner"></span> 処理中...';
        } else {
            button.disabled = false;
            button.innerHTML = 'ログイン';
        }
    }

    // Utility method to make authenticated API calls
    async makeAuthenticatedRequest(endpoint, options = {}) {
        if (!this.sessionId) {
            throw new Error('Not authenticated');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.sessionId}`,
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        const response = await fetch(`${this.apiBaseUrl}${endpoint}`, mergedOptions);
        
        if (response.status === 401) {
            this.clearSession();
            this.showMessage('セッションが期限切れです。再度ログインしてください。', 'warning');
            this.showPage('login');
            throw new Error('Session expired');
        }

        return response;
    }

    async loadPosts() {
        const postsContainer = document.getElementById('postsContainer');
        const postsLoading = document.getElementById('postsLoading');
        const postsLimit = document.getElementById('postsLimit');

        if (!postsContainer || !postsLoading) return;

        try {
            // Show loading state
            postsLoading.classList.remove('hidden');
            postsContainer.innerHTML = '';

            const limit = postsLimit ? postsLimit.value : '10';
            
            let response;
            
            if (this.currentFeedType === 'following') {
                // Load following feed
                response = await this.makeAuthenticatedRequest(
                    `/posts/following?limit=${limit}`
                );
            } else {
                // Load user's own posts
                const userIdentifier = localStorage.getItem('userIdentifier');
                if (!userIdentifier) {
                    throw new Error('User identifier not found');
                }

                response = await this.makeAuthenticatedRequest(
                    `/posts?identifier=${encodeURIComponent(userIdentifier)}&limit=${limit}`
                );
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                this.renderPosts(data.data);
            } else {
                throw new Error(data.message || 'Failed to load posts');
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
            const feedTypeText = this.currentFeedType === 'following' ? 'フォロー中の投稿' : '自分の投稿';
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>${feedTypeText}の読み込みに失敗しました</h3>
                    <p>${error.message}</p>
                    <button class="btn" onclick="window.app.loadPosts()">再試行</button>
                </div>
            `;
        } finally {
            postsLoading.classList.add('hidden');
        }
    }

    renderPosts(posts) {
        const postsContainer = document.getElementById('postsContainer');
        
        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>投稿が見つかりません</h3>
                    <p>投稿を取得できませんでした。設定を確認してください。</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = posts.map(post => this.renderPost(post)).join('');
        
        // Add click listeners to word highlights
        this.setupWordClickListeners();
    }

    renderPost(post) {
        const createdAt = new Date(post.createdAt).toLocaleString('ja-JP');
        const highlightedText = this.highlightWords(post.text, post.extractedWords || []);
        
        return `
            <div class="post-item">
                <div class="post-header">
                    <span class="post-author">${post.author?.displayName || 'Unknown'}</span>
                    <span class="post-handle">@${post.author?.handle || 'unknown'}</span>
                    <span class="post-date">${createdAt}</span>
                </div>
                <div class="post-content">
                    ${highlightedText}
                </div>
            </div>
        `;
    }

    highlightWords(text, extractedWords) {
        if (!extractedWords || extractedWords.length === 0) {
            return this.escapeHtml(text);
        }

        let highlightedText = this.escapeHtml(text);
        
        // Sort words by length (longest first) to avoid partial matches
        const sortedWords = [...extractedWords].sort((a, b) => b.length - a.length);
        
        sortedWords.forEach(word => {
            const escapedWord = this.escapeRegex(word);
            const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
            const wordStatus = this.getWordStatus(word.toLowerCase());
            
            highlightedText = highlightedText.replace(regex, (match) => {
                return `<span class="word-highlight word-${wordStatus}" data-word="${this.escapeHtml(word.toLowerCase())}">${match}</span>`;
            });
        });

        return highlightedText;
    }

    getWordStatus(word) {
        const savedWords = this.getSavedWords();
        const wordData = savedWords[word];
        
        if (!wordData) {
            return 'unknown';
        }
        
        // Handle both old string format and new object format
        if (typeof wordData === 'string') {
            return wordData;
        } else if (typeof wordData === 'object' && wordData.status) {
            return wordData.status;
        }
        
        return 'unknown';
    }

    getSavedWords() {
        const userIdentifier = localStorage.getItem('userIdentifier');
        const storageKey = userIdentifier ? `savedWords_${userIdentifier}` : 'savedWords';
        return JSON.parse(localStorage.getItem(storageKey) || '{}');
    }

    setSavedWords(words) {
        const userIdentifier = localStorage.getItem('userIdentifier');
        const storageKey = userIdentifier ? `savedWords_${userIdentifier}` : 'savedWords';
        localStorage.setItem(storageKey, JSON.stringify(words));
    }

    setupWordClickListeners() {
        const wordHighlights = document.querySelectorAll('.word-highlight');
        wordHighlights.forEach(element => {
            element.addEventListener('click', (e) => {
                const word = e.target.dataset.word;
                if (word) {
                    this.handleWordClick(word, e.target);
                }
            });
        });
    }

    async handleWordClick(word, element) {
        try {
            const currentStatus = this.getWordStatus(word);
            
            if (currentStatus === 'unknown') {
                // Show word detail modal first
                await this.showWordDetail(word);
            } else {
                // For known/learning words, show detail directly
                await this.showWordDetail(word);
            }
        } catch (error) {
            console.error('Failed to handle word click:', error);
            this.showMessage('単語の処理に失敗しました', 'error');
        }
    }

    async saveWord(word, status = 'learning') {
        try {
            // Try to save to API first
            let apiSuccess = false;
            
            try {
                // Check if word already exists in API
                const existingWordsResponse = await this.makeAuthenticatedRequest('/words');
                let existingWord = null;
                
                if (existingWordsResponse.ok) {
                    const existingWordsData = await existingWordsResponse.json();
                    if (existingWordsData.success && existingWordsData.data) {
                        existingWord = existingWordsData.data.find(w => w.word.toLowerCase() === word.toLowerCase());
                    }
                }

                if (existingWord) {
                    // Update existing word
                    const updateResponse = await this.makeAuthenticatedRequest(`/words/${existingWord.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            status: status
                        })
                    });
                    
                    if (updateResponse.ok) {
                        apiSuccess = true;
                        console.log(`Updated word "${word}" status to "${status}" via API`);
                    }
                } else {
                    // Create new word
                    const createResponse = await this.makeAuthenticatedRequest('/words', {
                        method: 'POST',
                        body: JSON.stringify({
                            word: word,
                            status: status
                        })
                    });
                    
                    if (createResponse.ok) {
                        apiSuccess = true;
                        console.log(`Created new word "${word}" with status "${status}" via API`);
                    }
                }
            } catch (apiError) {
                console.log('API save failed, using localStorage:', apiError.message);
            }

            // Always update localStorage as backup/cache
            const savedWords = this.getSavedWords();
            const wordData = savedWords[word];
            
            if (!wordData) {
                // New word - save with current timestamp
                savedWords[word] = {
                    status: status,
                    createdAt: new Date().toISOString(),
                    reviewCount: 0,
                    correctCount: 0
                };
            } else if (typeof wordData === 'string') {
                // Convert old format to new format
                savedWords[word] = {
                    status: status,
                    createdAt: new Date().toISOString(), // Use current time for existing words
                    reviewCount: 0,
                    correctCount: 0
                };
            } else {
                // Update existing word
                savedWords[word] = {
                    ...wordData,
                    status: status
                };
            }
            
            this.setSavedWords(savedWords);
            console.log(`Saved word "${word}" to localStorage as backup`);
            
        } catch (error) {
            console.error('Failed to save word:', error);
            throw error;
        }
    }

    async showWordDetail(word) {
        try {
            // Show loading state
            this.showWordDetailModal(word, null, true);
            
            // Fetch definition from API
            const definition = await this.fetchWordDefinition(word);
            
            // Show the modal with definition
            this.showWordDetailModal(word, definition, false);
            
        } catch (error) {
            console.error('Failed to fetch word definition:', error);
            // Show modal with error state
            this.showWordDetailModal(word, null, false, error.message);
        }
    }

    async fetchWordDefinition(word) {
        const response = await this.makeAuthenticatedRequest(`/words/${encodeURIComponent(word)}/definition`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('辞書に定義が見つかりませんでした');
            }
            throw new Error(`定義の取得に失敗しました: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.data) {
            return data.data;
        } else {
            throw new Error(data.message || '定義の取得に失敗しました');
        }
    }

    showWordDetailModal(word, definition, isLoading, errorMessage) {
        // Remove existing modal if any
        this.closeWordDetailModal();
        
        const currentStatus = this.getWordStatus(word);
        
        let modalContent = '';
        
        if (isLoading) {
            modalContent = `
                <div class="word-detail-modal">
                    <div class="word-detail-content">
                        <div class="word-detail-header">
                            <h3>${this.escapeHtml(word)}</h3>
                            <button class="close-btn" onclick="window.app.closeWordDetailModal()">&times;</button>
                        </div>
                        <div class="word-detail-body">
                            <div class="text-center">
                                <div class="loading-spinner" style="margin: 2rem auto;"></div>
                                <p>定義を取得中...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (errorMessage) {
            modalContent = `
                <div class="word-detail-modal">
                    <div class="word-detail-content">
                        <div class="word-detail-header">
                            <div class="word-detail-header-left">
                                <h3>${this.escapeHtml(word)}</h3>
                            </div>
                            <button class="close-btn" onclick="window.app.closeWordDetailModal()">&times;</button>
                        </div>
                        <div class="word-detail-body">
                            <div class="status-message status-error">
                                <p>${this.escapeHtml(errorMessage)}</p>
                            </div>
                        </div>
                        <div class="word-detail-footer">
                            <h4>学習状況:</h4>
                            ${this.renderWordStatusButtons(word, currentStatus)}
                            ${currentStatus !== 'unknown' ? `
                                <button class="btn btn-danger delete-word-btn" 
                                        data-word="${this.escapeHtml(word)}">単語を削除</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else if (definition) {
            modalContent = `
                <div class="word-detail-modal">
                    <div class="word-detail-content">
                        <div class="word-detail-header">
                            <div class="word-detail-header-left">
                                <h3>${this.escapeHtml(definition.word)}</h3>
                            </div>
                            <button class="close-btn" onclick="window.app.closeWordDetailModal()">&times;</button>
                        </div>
                        <div class="word-detail-body">
                            ${definition.pronunciation ? `
                                <div class="pronunciation">
                                    <strong>発音:</strong> ${this.escapeHtml(definition.pronunciation)}
                                    ${definition.audioUrl ? `
                                        <button class="audio-btn" onclick="window.app.playAudio('${definition.audioUrl}')" title="音声を再生">🔊</button>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            <div class="definitions">
                                <h4>意味:</h4>
                                ${definition.definitions.map(def => `
                                    <div class="definition-item">
                                        <div class="part-of-speech">${this.escapeHtml(def.partOfSpeech)}</div>
                                        <div class="definition-text">${this.escapeHtml(def.definition)}</div>
                                        ${def.example ? `
                                            <div class="example-sentence">
                                                <em>例: ${this.escapeHtml(def.example)}</em>
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="word-detail-footer">
                            <h4>学習状況:</h4>
                            ${this.renderWordStatusButtons(word, currentStatus)}
                            ${currentStatus !== 'unknown' ? `
                                <button class="btn btn-danger delete-word-btn" 
                                        data-word="${this.escapeHtml(word)}">単語を削除</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add modal to DOM
        const modalContainer = document.createElement('div');
        modalContainer.id = 'wordDetailModalContainer';
        modalContainer.innerHTML = modalContent;
        document.body.appendChild(modalContainer);
        
        // Add event listeners for word actions
        this.setupWordDetailActions(word);
        
        // Close modal when clicking outside
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer || e.target.classList.contains('word-detail-modal')) {
                this.closeWordDetailModal();
            }
        });
    }

    renderWordStatusButtons(word, currentStatus) {
        return `
            <div class="word-status-buttons">
                <button class="status-btn ${currentStatus === 'unknown' ? 'active' : ''}" 
                        data-word="${this.escapeHtml(word)}" 
                        data-status="unknown">未知</button>
                <button class="status-btn ${currentStatus === 'learning' ? 'active' : ''}" 
                        data-word="${this.escapeHtml(word)}" 
                        data-status="learning">学習中</button>
                <button class="status-btn ${currentStatus === 'known' ? 'active' : ''}" 
                        data-word="${this.escapeHtml(word)}" 
                        data-status="known">既知</button>
            </div>
        `;
    }

    renderWordActions(word, currentStatus) {
        return `
            <div class="word-actions-section">
                <h4>学習状況:</h4>
                <div class="word-status-buttons">
                    <button class="status-btn ${currentStatus === 'unknown' ? 'active' : ''}" 
                            data-word="${this.escapeHtml(word)}" 
                            data-status="unknown">未知</button>
                    <button class="status-btn ${currentStatus === 'learning' ? 'active' : ''}" 
                            data-word="${this.escapeHtml(word)}" 
                            data-status="learning">学習中</button>
                    <button class="status-btn ${currentStatus === 'known' ? 'active' : ''}" 
                            data-word="${this.escapeHtml(word)}" 
                            data-status="known">既知</button>
                </div>
                ${currentStatus !== 'unknown' ? `
                    <button class="btn btn-danger delete-word-btn" 
                            data-word="${this.escapeHtml(word)}">単語を削除</button>
                ` : ''}
            </div>
        `;
    }

    setupWordDetailActions(word) {
        // Status button listeners
        const statusButtons = document.querySelectorAll('#wordDetailModalContainer .status-btn');
        statusButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const targetWord = e.target.dataset.word;
                const newStatus = e.target.dataset.status;
                if (targetWord && newStatus) {
                    await this.updateWordStatusInModal(targetWord, newStatus, e.target);
                }
            });
        });

        // Delete button listener
        const deleteButton = document.querySelector('#wordDetailModalContainer .delete-word-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                const targetWord = e.target.dataset.word;
                if (targetWord) {
                    this.deleteWordFromModal(targetWord);
                }
            });
        }
    }

    async updateWordStatusInModal(word, newStatus, buttonElement) {
        try {
            // Update local storage
            await this.saveWord(word, newStatus);
            
            // Update button states
            const statusButtons = document.querySelectorAll('#wordDetailModalContainer .status-btn');
            statusButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.status === newStatus) {
                    btn.classList.add('active');
                }
            });
            
            // Update word highlights in posts if visible
            this.updateWordHighlights(word, newStatus);
            
            // Show success message
            this.showMessage(`単語「${word}」のステータスを「${this.getStatusLabel(newStatus)}」に更新しました`, 'success');
            
            // If on words page, refresh the list
            if (this.currentPage === 'words') {
                this.loadWords();
            }
            
        } catch (error) {
            console.error('Failed to update word status:', error);
            this.showMessage('ステータスの更新に失敗しました', 'error');
        }
    }

    deleteWordFromModal(word) {
        // Close modal first
        this.closeWordDetailModal();
        
        // Show delete confirmation
        this.showDeleteConfirmation(word);
    }

    updateWordHighlights(word, newStatus) {
        const wordHighlights = document.querySelectorAll(`.word-highlight[data-word="${word}"]`);
        wordHighlights.forEach(element => {
            // Remove all status classes
            element.classList.remove('word-unknown', 'word-learning', 'word-known');
            // Add new status class
            element.classList.add(`word-${newStatus}`);
        });
    }

    getStatusLabel(status) {
        const labels = {
            unknown: '未知',
            learning: '学習中',
            known: '既知'
        };
        return labels[status] || status;
    }

    closeWordDetailModal() {
        const modalContainer = document.getElementById('wordDetailModalContainer');
        if (modalContainer) {
            modalContainer.remove();
        }
    }

    playAudio(audioUrl) {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play().catch(error => {
                console.error('Failed to play audio:', error);
                this.showMessage('音声の再生に失敗しました', 'error');
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async loadWords() {
        const wordsContainer = document.getElementById('wordsContainer');
        const wordsLoading = document.getElementById('wordsLoading');
        const wordsStats = document.getElementById('wordsStats');

        if (!wordsContainer || !wordsLoading) return;

        try {
            // Show loading state
            wordsLoading.classList.remove('hidden');
            wordsContainer.innerHTML = '';

            // Try to load from API first, fallback to localStorage
            let wordsArray = [];
            
            try {
                const response = await this.makeAuthenticatedRequest('/words');
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        wordsArray = data.data.map(word => ({
                            id: word.id,
                            word: word.word,
                            status: word.status || 'unknown',
                            createdAt: word.date || word.createdAt || new Date().toISOString(),
                            reviewCount: word.reviewCount || 0,
                            correctCount: word.correctCount || 0,
                            definition: word.definition,
                            exampleSentence: word.exampleSentence
                        }));
                        console.log(`Loaded ${wordsArray.length} words from API`);
                    }
                }
            } catch (apiError) {
                console.log('API not available, falling back to localStorage:', apiError.message);
            }

            // Fallback to localStorage if API fails or returns no data
            if (wordsArray.length === 0) {
                const savedWords = this.getSavedWords();
                wordsArray = Object.entries(savedWords).map(([word, wordData]) => {
                    // Handle both old string format and new object format
                    if (typeof wordData === 'string') {
                        return {
                            word,
                            status: wordData,
                            createdAt: new Date().toISOString(), // Use current time for old format
                            reviewCount: 0,
                            correctCount: 0
                        };
                    } else if (typeof wordData === 'object') {
                        return {
                            word,
                            status: wordData.status || 'unknown',
                            createdAt: wordData.createdAt || new Date().toISOString(),
                            reviewCount: wordData.reviewCount || 0,
                            correctCount: wordData.correctCount || 0
                        };
                    } else {
                        return {
                            word,
                            status: 'unknown',
                            createdAt: new Date().toISOString(),
                            reviewCount: 0,
                            correctCount: 0
                        };
                    }
                });
                console.log(`Loaded ${wordsArray.length} words from localStorage`);
            }

            this.allWords = wordsArray;
            this.renderWordsStats(wordsArray);
            this.filterWords();

        } catch (error) {
            console.error('Failed to load words:', error);
            wordsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>単語の読み込みに失敗しました</h3>
                    <p>${error.message}</p>
                    <button class="btn" onclick="window.app.loadWords()">再試行</button>
                </div>
            `;
        } finally {
            wordsLoading.classList.add('hidden');
        }
    }

    renderWordsStats(words) {
        const wordsStats = document.getElementById('wordsStats');
        if (!wordsStats) return;

        const stats = {
            total: words.length,
            unknown: words.filter(w => w.status === 'unknown').length,
            learning: words.filter(w => w.status === 'learning').length,
            known: words.filter(w => w.status === 'known').length
        };

        // Get current filter to set active tab
        const currentFilter = this.currentWordsFilter || 'all';

        wordsStats.innerHTML = `
            <div class="stat-tab filter-all ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">総単語数</div>
            </div>
            <div class="stat-tab filter-unknown ${currentFilter === 'unknown' ? 'active' : ''}" data-filter="unknown">
                <div class="stat-number">${stats.unknown}</div>
                <div class="stat-label">未知</div>
            </div>
            <div class="stat-tab filter-learning ${currentFilter === 'learning' ? 'active' : ''}" data-filter="learning">
                <div class="stat-number">${stats.learning}</div>
                <div class="stat-label">学習中</div>
            </div>
            <div class="stat-tab filter-known ${currentFilter === 'known' ? 'active' : ''}" data-filter="known">
                <div class="stat-number">${stats.known}</div>
                <div class="stat-label">既知</div>
            </div>
        `;

        // Add click listeners to stat tabs
        this.setupStatTabListeners();
    }

    setupStatTabListeners() {
        const statTabs = document.querySelectorAll('.stat-tab');
        statTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const filterValue = e.currentTarget.dataset.filter;
                if (filterValue) {
                    this.setWordsFilter(filterValue);
                }
            });
        });
    }

    setWordsFilter(filterValue) {
        this.currentWordsFilter = filterValue;
        
        // Update active tab
        const statTabs = document.querySelectorAll('.stat-tab');
        statTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.filter === filterValue) {
                tab.classList.add('active');
            }
        });

        // Apply filter and render
        this.filterWords();
    }

    filterWords() {
        const wordsSort = document.getElementById('wordsSort');
        const filterValue = this.currentWordsFilter || 'all';
        const sortValue = wordsSort ? wordsSort.value : 'date-desc';
        
        let filteredWords = this.allWords || [];
        
        // Apply filter
        if (filterValue !== 'all') {
            filteredWords = filteredWords.filter(word => word.status === filterValue);
        }

        // Apply sorting
        filteredWords = this.sortWords(filteredWords, sortValue);

        this.renderWords(filteredWords);
    }

    sortWords(words, sortType) {
        const sortedWords = [...words];
        
        switch (sortType) {
            case 'date-desc':
                // Newest first
                return sortedWords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'date-asc':
                // Oldest first
                return sortedWords.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'alphabetical':
                // Alphabetical order
                return sortedWords.sort((a, b) => a.word.localeCompare(b.word));
            default:
                return sortedWords;
        }
    }

    renderWords(words) {
        const wordsContainer = document.getElementById('wordsContainer');
        
        if (!words || words.length === 0) {
            wordsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>単語が見つかりません</h3>
                    <p>投稿から単語を保存すると、ここに表示されます。</p>
                </div>
            `;
            return;
        }

        // Words are already sorted by filterWords method
        wordsContainer.innerHTML = words.map(word => this.renderWordItem(word)).join('');
        
        // Add click listeners to status buttons and word items
        this.setupWordStatusListeners();
        this.setupWordItemClickListeners();
    }

    renderWordItem(wordData) {
        const createdAt = new Date(wordData.createdAt).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const statusLabels = {
            unknown: '未知',
            learning: '学習中',
            known: '既知'
        };

        return `
            <div class="word-item" data-word="${this.escapeHtml(wordData.word)}">
                <div class="word-clickable" data-word="${this.escapeHtml(wordData.word)}">
                    <div class="word-info">
                        <div class="word-text">${this.escapeHtml(wordData.word)}</div>
                        <div class="word-meta">
                            追加日: ${createdAt} | 
                            復習回数: ${wordData.reviewCount || 0} | 
                            正解数: ${wordData.correctCount || 0}
                        </div>
                    </div>
                    <div class="word-actions">
                        <div class="status-buttons">
                            <button class="status-btn ${wordData.status === 'unknown' ? 'active' : ''}" 
                                    data-word="${this.escapeHtml(wordData.word)}" 
                                    data-status="unknown">未知</button>
                            <button class="status-btn ${wordData.status === 'learning' ? 'active' : ''}" 
                                    data-word="${this.escapeHtml(wordData.word)}" 
                                    data-status="learning">学習中</button>
                            <button class="status-btn ${wordData.status === 'known' ? 'active' : ''}" 
                                    data-word="${this.escapeHtml(wordData.word)}" 
                                    data-status="known">既知</button>
                        </div>
                    </div>
                </div>
                <div class="word-delete-section">
                    <button class="delete-btn" 
                            data-word="${this.escapeHtml(wordData.word)}" 
                            title="単語を削除">🗑️</button>
                </div>
            </div>
        `;
    }

    setupWordStatusListeners() {
        const statusButtons = document.querySelectorAll('.status-btn');
        statusButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const word = e.target.dataset.word;
                const newStatus = e.target.dataset.status;
                if (word && newStatus) {
                    this.updateWordStatus(word, newStatus, e.target);
                }
            });
        });

        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const word = e.target.dataset.word;
                if (word) {
                    this.showDeleteConfirmation(word);
                }
            });
        });
    }

    setupWordItemClickListeners() {
        const wordClickables = document.querySelectorAll('.word-clickable');
        wordClickables.forEach(element => {
            element.addEventListener('click', async (e) => {
                const word = e.currentTarget.dataset.word;
                if (word) {
                    try {
                        await this.showWordDetail(word);
                    } catch (error) {
                        console.error('Failed to show word detail:', error);
                        this.showMessage('単語の詳細表示に失敗しました', 'error');
                    }
                }
            });
        });
    }

    showDeleteConfirmation(word) {
        // Create confirmation dialog
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.innerHTML = `
            <div class="confirmation-content">
                <h3>単語を削除</h3>
                <p>「<strong>${this.escapeHtml(word)}</strong>」を削除しますか？<br>この操作は取り消せません。</p>
                <div class="confirmation-buttons">
                    <button class="btn btn-secondary" id="cancelDelete">キャンセル</button>
                    <button class="btn btn-danger" id="confirmDelete">削除</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add event listeners
        const cancelBtn = dialog.querySelector('#cancelDelete');
        const confirmBtn = dialog.querySelector('#confirmDelete');

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        confirmBtn.addEventListener('click', () => {
            this.deleteWord(word);
            document.body.removeChild(dialog);
        });

        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }

    async deleteWord(word) {
        try {
            // Try to delete from API first
            let apiSuccess = false;
            
            try {
                // Find the word in API
                const wordsResponse = await this.makeAuthenticatedRequest('/words');
                if (wordsResponse.ok) {
                    const wordsData = await wordsResponse.json();
                    if (wordsData.success && wordsData.data) {
                        const existingWord = wordsData.data.find(w => w.word.toLowerCase() === word.toLowerCase());
                        
                        if (existingWord) {
                            const deleteResponse = await this.makeAuthenticatedRequest(`/words/${existingWord.id}`, {
                                method: 'DELETE'
                            });
                            
                            if (deleteResponse.ok) {
                                apiSuccess = true;
                                console.log(`Deleted word "${word}" via API`);
                            }
                        }
                    }
                }
            } catch (apiError) {
                console.log('API delete failed, removing from localStorage only:', apiError.message);
            }

            // Always remove from localStorage
            const savedWords = this.getSavedWords();
            delete savedWords[word];
            this.setSavedWords(savedWords);
            console.log(`Removed word "${word}" from localStorage`);

            // Reload words to update the display
            this.loadWords();

            this.showMessage(`単語「${word}」を削除しました`, 'success');
        } catch (error) {
            console.error('Failed to delete word:', error);
            this.showMessage('単語の削除に失敗しました', 'error');
        }
    }

    async updateWordStatus(word, newStatus, buttonElement) {
        try {
            // Use the unified saveWord function that handles both API and localStorage
            await this.saveWord(word, newStatus);

            // Update UI
            const wordItem = buttonElement.closest('.word-item');
            if (wordItem) {
                // Update status badge
                const statusBadge = wordItem.querySelector('.word-status-badge');
                if (statusBadge) {
                    statusBadge.className = `word-status-badge status-${newStatus}`;
                    const statusLabels = {
                        unknown: '未知',
                        learning: '学習中',
                        known: '既知'
                    };
                    statusBadge.textContent = statusLabels[newStatus];
                }

                // Update active button
                const statusButtons = wordItem.querySelectorAll('.status-btn');
                statusButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.status === newStatus) {
                        btn.classList.add('active');
                    }
                });
            }

            // Update stats and re-filter if necessary
            this.loadWords();

            this.showMessage(`単語「${word}」のステータスを更新しました`, 'success');
        } catch (error) {
            console.error('Failed to update word status:', error);
            this.showMessage('ステータスの更新に失敗しました', 'error');
        }
    }

    // Quiz functionality
    setupQuizEventListeners() {
        // Use event delegation for all quiz buttons to handle dynamic content
        document.addEventListener('click', (e) => {
            switch (e.target.id) {
                case 'startQuizBtn':
                    e.preventDefault();
                    this.startQuiz();
                    break;
                case 'submitAnswerBtn':
                    e.preventDefault();
                    this.submitQuizAnswer();
                    break;
                case 'skipQuestionBtn':
                    e.preventDefault();
                    this.skipQuestion();
                    break;
                case 'nextQuestionBtn':
                    e.preventDefault();
                    this.nextQuestion();
                    break;
                case 'backToMenuBtn':
                    e.preventDefault();
                    this.backToQuizMenu();
                    break;
            }
        });

        // Handle form submission for answer form
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'answerForm') {
                e.preventDefault();
                this.submitQuizAnswer();
            }
        });

        // Handle Enter key for quiz interactions
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const questionScreen = document.getElementById('quizQuestionScreen');
                const resultScreen = document.getElementById('quizResultScreen');
                const answerInput = document.getElementById('answerInput');
                
                // If we're in question screen and answer input is focused or form is active
                if (questionScreen && !questionScreen.classList.contains('hidden')) {
                    if (answerInput && (document.activeElement === answerInput || e.target === answerInput)) {
                        e.preventDefault();
                        this.submitQuizAnswer();
                    }
                }
                // If we're in result screen
                else if (resultScreen && !resultScreen.classList.contains('hidden')) {
                    e.preventDefault();
                    this.nextQuestion();
                }
            }
        });
    }

    async startQuiz() {
        try {
            const questionCount = document.getElementById('quizQuestionCount').value;
            
            this.showQuizLoading(true);
            this.hideAllQuizScreens();

            // Start quiz session
            const response = await this.makeAuthenticatedRequest(`/learning/quiz?count=${questionCount}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                this.currentQuizSession = data.data;
                this.currentQuestionIndex = 0;
                this.quizAnswers = [];
                this.questionStartTime = Date.now();
                
                this.showCurrentQuestion();
            } else {
                throw new Error(data.message || 'Failed to start quiz');
            }
        } catch (error) {
            console.error('Failed to start quiz:', error);
            this.showMessage(error.message || 'クイズの開始に失敗しました', 'error');
            this.showQuizScreen('start');
        } finally {
            this.showQuizLoading(false);
        }
    }

    showCurrentQuestion() {
        if (!this.currentQuizSession || !this.currentQuizSession.currentQuestion) {
            this.showMessage('問題の読み込みに失敗しました', 'error');
            return;
        }

        const question = this.currentQuizSession.currentQuestion;
        
        // Update progress
        const progress = ((this.currentQuestionIndex + 1) / this.currentQuizSession.totalQuestions) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('currentQuestionNum').textContent = this.currentQuestionIndex + 1;
        document.getElementById('totalQuestions').textContent = this.currentQuizSession.totalQuestions;

        // Update question
        document.getElementById('questionType').textContent = this.getQuestionTypeLabel(question.questionType);
        document.getElementById('questionText').textContent = question.question;

        // Clear and focus answer input
        const answerInput = document.getElementById('answerInput');
        answerInput.value = '';
        answerInput.focus();

        // Reset button states
        document.getElementById('submitAnswerBtn').disabled = false;
        document.getElementById('submitAnswerBtn').classList.remove('loading');

        this.questionStartTime = Date.now();
        this.showQuizScreen('question');
    }

    getQuestionTypeLabel(questionType) {
        switch (questionType) {
            case 'meaning': return '意味';
            case 'usage': return '用法';
            case 'pronunciation': return '発音';
            default: return '問題';
        }
    }

    async submitQuizAnswer() {
        const answerInput = document.getElementById('answerInput');
        const answer = answerInput.value.trim();

        if (!answer) {
            this.showMessage('回答を入力してください', 'warning');
            answerInput.focus();
            return;
        }

        try {
            const submitBtn = document.getElementById('submitAnswerBtn');
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');

            const responseTime = Date.now() - this.questionStartTime;

            const response = await this.makeAuthenticatedRequest('/learning/quiz/answer', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: this.currentQuizSession.sessionId,
                    answer: answer,
                    responseTimeMs: responseTime
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                // Record the answer
                if (!this.quizAnswers) {
                    this.quizAnswers = [];
                }
                this.quizAnswers.push({
                    question: this.currentQuizSession.currentQuestion.question,
                    userAnswer: answer,
                    isCorrect: data.data.isCorrect,
                    correctAnswer: data.data.correctAnswer
                });
                
                this.showQuizResult(data.data);
            } else {
                throw new Error(data.message || 'Failed to submit answer');
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
            this.showMessage(error.message || '回答の送信に失敗しました', 'error');
            
            // Re-enable button
            const submitBtn = document.getElementById('submitAnswerBtn');
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    async skipQuestion() {
        try {
            const skipBtn = document.getElementById('skipAnswerBtn');
            if (skipBtn) {
                skipBtn.disabled = true;
                skipBtn.classList.add('loading');
            }

            const responseTime = Date.now() - this.questionStartTime;

            const response = await this.makeAuthenticatedRequest('/learning/quiz/answer', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: this.currentQuizSession.sessionId,
                    answer: '', // Empty answer for skip
                    responseTimeMs: responseTime
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                // Record the skipped answer
                if (!this.quizAnswers) {
                    this.quizAnswers = [];
                }
                this.quizAnswers.push({
                    question: this.currentQuizSession.currentQuestion.question,
                    userAnswer: '(スキップ)',
                    isCorrect: false,
                    correctAnswer: data.data.correctAnswer
                });
                
                this.showQuizResult(data.data);
            } else {
                throw new Error(data.message || 'Failed to skip question');
            }
        } catch (error) {
            console.error('Failed to skip question:', error);
            this.showMessage(error.message || '問題のスキップに失敗しました', 'error');
            
            // Re-enable button
            const skipBtn = document.getElementById('skipAnswerBtn');
            if (skipBtn) {
                skipBtn.disabled = false;
                skipBtn.classList.remove('loading');
            }
        }
    }

    showQuizResult(resultData) {
        const resultScreen = document.getElementById('quizResultScreen');
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultExplanation = document.getElementById('resultExplanation');

        // Update result display
        if (resultData.isCorrect) {
            resultScreen.className = 'quiz-screen result-correct';
            resultIcon.textContent = '✅';
            resultTitle.textContent = '正解！';
        } else {
            resultScreen.className = 'quiz-screen result-incorrect';
            resultIcon.textContent = '❌';
            resultTitle.textContent = '不正解';
        }

        // Create detailed explanation
        let explanationHTML = '';
        const currentQuestion = this.currentQuizSession.currentQuestion;
        
        if (resultData.isCorrect) {
            explanationHTML = `
                <p style="color: #28a745; font-weight: bold; margin-bottom: 10px;">Correct! Well done.</p>
                <p><strong>正解:</strong> ${this.escapeHtml(resultData.correctAnswer)}</p>
            `;
        } else {
            explanationHTML = `
                <p><strong>正解:</strong> ${this.escapeHtml(resultData.correctAnswer)}</p>
            `;
        }

        // Add additional context based on question type
        if (currentQuestion.questionType === 'meaning') {
            explanationHTML += `<p style="margin-top: 10px; color: #666; font-size: 0.9em;"><strong>単語:</strong> ${this.escapeHtml(currentQuestion.word)}</p>`;
        } else if (currentQuestion.questionType === 'usage') {
            // Show the complete sentence with the correct word
            const completeSentence = currentQuestion.question.replace('Fill in the blank: "', '').replace('"', '').replace('___', `<strong>${this.escapeHtml(resultData.correctAnswer)}</strong>`);
            explanationHTML += `<p style="margin-top: 10px; color: #666; font-size: 0.9em;"><strong>完成した文:</strong> ${completeSentence}</p>`;
        }

        resultExplanation.innerHTML = explanationHTML;

        // Store result data for next question
        this.currentQuizResult = resultData;

        this.showQuizScreen('result');
    }

    nextQuestion() {
        if (!this.currentQuizResult) {
            return;
        }

        if (this.currentQuizResult.sessionCompleted) {
            // Quiz is completed, show results
            if (this.currentQuizResult.results) {
                this.showQuizComplete(this.currentQuizResult.results);
            } else {
                // If results are not included, try to fetch them
                this.fetchQuizResults();
            }
        } else if (this.currentQuizResult.nextQuestion) {
            this.currentQuizSession.currentQuestion = this.currentQuizResult.nextQuestion;
            this.currentQuestionIndex++;
            this.showCurrentQuestion();
        } else {
            this.showMessage('次の問題の読み込みに失敗しました', 'error');
        }
    }

    async fetchQuizResults() {
        try {
            // For now, create a simple result summary
            const totalQuestions = this.currentQuizSession.totalQuestions || 5;
            const correctAnswers = this.quizAnswers ? this.quizAnswers.filter(a => a.isCorrect).length : 0;
            const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

            const results = {
                sessionId: this.currentQuizSession.sessionId,
                totalQuestions: totalQuestions,
                correctAnswers: correctAnswers,
                accuracy: accuracy,
                completedAt: new Date().toISOString()
            };

            this.showQuizComplete(results);
        } catch (error) {
            console.error('Failed to fetch quiz results:', error);
            this.showMessage('結果の読み込みに失敗しました', 'error');
            this.showQuizScreen('start');
        }
    }

    showQuizComplete(results) {
        if (!results) {
            this.showMessage('結果の読み込みに失敗しました', 'error');
            return;
        }

        // Update final stats
        document.getElementById('finalScore').textContent = results.correctAnswers;
        document.getElementById('finalTotal').textContent = results.totalQuestions;
        document.getElementById('finalAccuracy').textContent = Math.round(results.accuracy * 100) + '%';

        this.showQuizScreen('complete');
    }

    restartQuiz() {
        this.currentQuizSession = null;
        this.currentQuizResult = null;
        this.currentQuestionIndex = 0;
        this.showQuizScreen('start');
    }

    backToQuizMenu() {
        this.restartQuiz();
        this.loadLearningStats();
    }

    showQuizScreen(screenName) {
        this.hideAllQuizScreens();
        
        const screens = {
            'start': 'quizStartScreen',
            'question': 'quizQuestionScreen',
            'result': 'quizResultScreen',
            'complete': 'quizCompleteScreen'
        };

        const screenId = screens[screenName];
        if (screenId) {
            const screen = document.getElementById(screenId);
            screen.classList.remove('hidden');
            
            // Auto-focus result screen for Enter key support
            if (screenName === 'result') {
                setTimeout(() => {
                    screen.focus();
                }, 100);
            }
        }
    }

    hideAllQuizScreens() {
        const screens = ['quizStartScreen', 'quizQuestionScreen', 'quizResultScreen', 'quizCompleteScreen'];
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('hidden');
            }
        });
    }

    showQuizLoading(show) {
        const loadingElement = document.getElementById('quizLoading');
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('hidden');
            } else {
                loadingElement.classList.add('hidden');
            }
        }
    }

    async loadLearningStats() {
        try {
            const response = await this.makeAuthenticatedRequest('/learning/stats');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                this.renderLearningStats(data.data);
            } else {
                throw new Error(data.message || 'Failed to load learning stats');
            }
        } catch (error) {
            console.error('Failed to load learning stats:', error);
            const statsContainer = document.getElementById('statsContainer');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="empty-state">
                        <p>統計の読み込みに失敗しました</p>
                    </div>
                `;
            }
        }
    }

    renderLearningStats(stats) {
        const statsContainer = document.getElementById('statsContainer');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-item">
                <div class="stat-number">${stats.totalWords}</div>
                <div class="stat-label">総単語数</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.unknownWords}</div>
                <div class="stat-label">未知の単語</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.learningWords}</div>
                <div class="stat-label">学習中</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.knownWords}</div>
                <div class="stat-label">習得済み</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.totalReviews}</div>
                <div class="stat-label">総復習回数</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${Math.round(stats.averageAccuracy * 100)}%</div>
                <div class="stat-label">平均正解率</div>
            </div>
        `;
    }

    // Progress page functionality
    async loadProgressData() {
        const progressContainer = document.getElementById('progressContainer');
        const progressLoading = document.getElementById('progressLoading');

        if (!progressContainer) return;

        try {
            // Show loading state
            if (progressLoading) {
                progressLoading.classList.remove('hidden');
            }
            progressContainer.innerHTML = '';

            const response = await this.makeAuthenticatedRequest('/learning/progress');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success && data.data) {
                this.renderProgressData(data.data);
            } else {
                throw new Error(data.message || 'Failed to load progress data');
            }
        } catch (error) {
            console.error('Failed to load progress data:', error);
            progressContainer.innerHTML = `
                <div class="empty-state">
                    <h3>進捗データの読み込みに失敗しました</h3>
                    <p>${error.message}</p>
                    <button class="btn" onclick="window.app.loadProgressData()">再試行</button>
                </div>
            `;
        } finally {
            // Hide loading state
            if (progressLoading) {
                progressLoading.classList.add('hidden');
            }
        }
    }

    renderProgressData(progressData) {
        const progressContainer = document.getElementById('progressContainer');
        if (!progressContainer) return;

        // Calculate progress percentages
        const totalWords = progressData.totalWords;
        const unknownPercentage = totalWords > 0 ? Math.round((progressData.unknownWords / totalWords) * 100) : 0;
        const learningPercentage = totalWords > 0 ? Math.round((progressData.learningWords / totalWords) * 100) : 0;
        const knownPercentage = totalWords > 0 ? Math.round((progressData.knownWords / totalWords) * 100) : 0;
        const accuracyPercentage = Math.round(progressData.averageAccuracy * 100);

        progressContainer.innerHTML = `
            <!-- Overall Progress Summary -->
            <div class="progress-summary">
                <h3>学習進捗サマリー</h3>
                <div class="progress-stats-grid">
                    <div class="progress-stat-card">
                        <div class="stat-icon">📚</div>
                        <div class="stat-content">
                            <div class="stat-number">${progressData.totalWords}</div>
                            <div class="stat-label">総単語数</div>
                        </div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <div class="stat-number">${progressData.knownWords}</div>
                            <div class="stat-label">習得済み</div>
                        </div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="stat-icon">📖</div>
                        <div class="stat-content">
                            <div class="stat-number">${progressData.learningWords}</div>
                            <div class="stat-label">学習中</div>
                        </div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-content">
                            <div class="stat-number">${accuracyPercentage}%</div>
                            <div class="stat-label">平均正解率</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Progress Visualization -->
            <div class="progress-visualization">
                <h3>学習状況の内訳</h3>
                <div class="progress-chart">
                    <div class="progress-bar-container">
                        <div class="progress-bar-label">
                            <span>学習進捗</span>
                            <span>${knownPercentage}% 完了</span>
                        </div>
                        <div class="progress-bar-track">
                            <div class="progress-bar-fill known" style="width: ${knownPercentage}%"></div>
                            <div class="progress-bar-fill learning" style="width: ${learningPercentage}%"></div>
                            <div class="progress-bar-fill unknown" style="width: ${unknownPercentage}%"></div>
                        </div>
                        <div class="progress-legend">
                            <div class="legend-item">
                                <span class="legend-color known"></span>
                                <span>習得済み (${progressData.knownWords}語, ${knownPercentage}%)</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-color learning"></span>
                                <span>学習中 (${progressData.learningWords}語, ${learningPercentage}%)</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-color unknown"></span>
                                <span>未知 (${progressData.unknownWords}語, ${unknownPercentage}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Statistics -->
            <div class="detailed-stats">
                <h3>詳細統計</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${progressData.totalReviews}</div>
                        <div class="stat-label">総復習回数</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${accuracyPercentage}%</div>
                        <div class="stat-label">平均正解率</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${progressData.knownWords + progressData.learningWords}</div>
                        <div class="stat-label">学習対象単語</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${totalWords > 0 ? Math.round(((progressData.knownWords + progressData.learningWords) / totalWords) * 100) : 0}%</div>
                        <div class="stat-label">学習カバー率</div>
                    </div>
                </div>
            </div>

            ${totalWords === 0 ? `
                <div class="empty-progress-state">
                    <h3>📚 学習を始めましょう！</h3>
                    <p>まだ単語が登録されていません。投稿ページで単語をクリックして保存するか、単語帳ページで直接追加してください。</p>
                    <div class="progress-actions">
                        <button class="btn" onclick="window.app.navigateToPage('posts')">投稿を見る</button>
                        <button class="btn btn-secondary" onclick="window.app.navigateToPage('words')">単語帳を見る</button>
                    </div>
                </div>
            ` : ''}
        `;
    }


}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BlueskyLangApp();
});