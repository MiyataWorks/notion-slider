// グローバル変数
let currentIndex = 0;
let items = [];
let itemsPerView = 3;
let notionToken = '';
let databaseId = '';

function extractDatabaseId(value){
    const input = String(value || '').trim();
    try{
        const u = new URL(input);
        const path = u.pathname || '';
        const m32 = path.match(/[0-9a-f]{32}/i);
        if(m32) return m32[0];
        const muuid = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if(muuid) return muuid[0];
    }catch(_e){/* not a URL */}
    return input;
}

function normalizeDatabaseId(value){
    const raw = String(value || '').trim();
    if(!raw) return null;
    if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return raw;
    const hex = raw.toLowerCase().replace(/[^0-9a-f]/g, '');
    if(hex.length === 32){
        return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    return null;
}

// DOM要素
const configPanel = document.getElementById('config-panel');
const showConfigBtn = document.getElementById('show-config-btn');
const toggleConfigBtn = document.getElementById('toggle-config-btn');
const loadBtn = document.getElementById('load-btn');
const sliderWrapper = document.getElementById('slider-wrapper');
const sliderTrack = document.getElementById('slider-track');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pagination = document.getElementById('pagination');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorMessage = document.getElementById('error-message');

// イベントリスナー
loadBtn.addEventListener('click', loadGallery);
prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));
toggleConfigBtn.addEventListener('click', toggleConfig);
showConfigBtn.addEventListener('click', toggleConfig);

// ローカルストレージから設定を復元
window.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('notionToken');
    const savedDatabaseId = localStorage.getItem('databaseId');
    const savedItemsPerView = localStorage.getItem('itemsPerView');
    
    if (savedToken) document.getElementById('notion-token').value = savedToken;
    if (savedDatabaseId) document.getElementById('database-id').value = savedDatabaseId;
    if (savedItemsPerView) document.getElementById('items-per-view').value = savedItemsPerView;
});

// 設定の表示/非表示
function toggleConfig() {
    const isHidden = configPanel.classList.contains('hidden');
    
    if (isHidden) {
        configPanel.classList.remove('hidden');
        showConfigBtn.style.display = 'none';
    } else {
        configPanel.classList.add('hidden');
        showConfigBtn.style.display = 'block';
    }
}

// ギャラリーを読み込む
async function loadGallery() {
    // 入力値を取得
    notionToken = document.getElementById('notion-token').value.trim();
    const inputDbId = document.getElementById('database-id').value.trim();
    const extracted = extractDatabaseId(inputDbId);
    const normalized = normalizeDatabaseId(extracted);
    databaseId = normalized || '';
    itemsPerView = parseInt(document.getElementById('items-per-view').value);
    
    // バリデーション
    if (!notionToken) {
        showError('Notion Integration Tokenを入力してください。');
        return;
    }
    if (!databaseId) {
        showError('Database IDの形式が正しくありません。NotionのURLまたはID(32桁/UUID)を入力してください。');
        return;
    }
    
    // 設定を保存
    localStorage.setItem('notionToken', notionToken);
    localStorage.setItem('databaseId', databaseId);
    localStorage.setItem('itemsPerView', itemsPerView);
    
    // UIの状態を更新
    loadBtn.classList.add('loading');
    hideAll();
    loading.style.display = 'block';
    
    try {
        // Notion APIからデータを取得
        const data = await fetchNotionDatabase();
        
        if (!data || !data.results || data.results.length === 0) {
            showError('データベースにアイテムが見つかりませんでした。');
            return;
        }
        
        items = data.results;
        currentIndex = 0;
        
        // ギャラリーを表示
        renderGallery();
        updateNavigation();
        createPagination();
        
        // 設定パネルを隠す
        configPanel.classList.add('hidden');
        showConfigBtn.style.display = 'block';
        
        // スライダーを表示
        hideAll();
        sliderWrapper.style.display = 'flex';
        pagination.style.display = 'flex';
        
    } catch (err) {
        console.error('エラー:', err);
        const message = err?.message || String(err);
        // よくあるNotionエラーの補助説明
        let hint = '';
        if (/unauthorized|invalid|authorization/i.test(message)) {
            hint = '（Tokenが不正、またはデータベースにIntegrationが追加されていない可能性）';
        } else if (/object not found|not found/i.test(message)) {
            hint = '（Database IDが誤っている可能性）';
        }
        showError(`エラーが発生しました: ${message} ${hint}`.trim());
    } finally {
        loadBtn.classList.remove('loading');
    }
}

// Notion APIからデータベースを取得
async function fetchNotionDatabase() {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            page_size: 100
        })
    });
    
    if (!response.ok) {
        let message = `HTTP error! status: ${response.status}`;
        try{
            const text = await response.text();
            try{
                const j = JSON.parse(text);
                message = j?.message || j?.error || message;
            }catch(_e){
                if (text) message = text;
            }
        }catch(_e){/* ignore */}
        throw new Error(message);
    }
    
    return await response.json();
}

// ギャラリーを描画
function renderGallery() {
    sliderTrack.innerHTML = '';
    
    items.forEach((item, index) => {
        const card = createCard(item, index);
        sliderTrack.appendChild(card);
    });
    
    updateSliderPosition();
}

// カードを作成
function createCard(item, index) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    
    // カードの幅を計算（レスポンシブ対応）
    const cardWidth = calculateCardWidth();
    card.style.width = `${cardWidth}px`;
    
    // 画像を取得
    const coverImage = getCoverImage(item);
    const icon = getIcon(item);
    
    // タイトルを取得
    const title = getTitle(item);
    
    // プロパティを取得
    const properties = getProperties(item);
    
    // カードのHTML
    card.innerHTML = `
        ${coverImage || icon ? 
            `<img src="${coverImage || icon}" alt="${title}" class="card-image" onerror="this.outerHTML='<div class=\\'card-image placeholder\\'>${getPlaceholderIcon(item)}</div>'">` :
            `<div class="card-image placeholder">${getPlaceholderIcon(item)}</div>`
        }
        <div class="card-content">
            <h3 class="card-title">${title}</h3>
            ${properties.description ? `<p class="card-description">${properties.description}</p>` : ''}
            ${properties.tags.length > 0 ? `
                <div class="card-properties">
                    ${properties.tags.map(tag => `<span class="card-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    // クリックイベント
    card.addEventListener('click', () => {
        window.open(item.url, '_blank');
    });
    
    return card;
}

// カバー画像を取得
function getCoverImage(item) {
    if (item.cover) {
        if (item.cover.type === 'external') {
            return item.cover.external.url;
        } else if (item.cover.type === 'file') {
            return item.cover.file.url;
        }
    }
    return null;
}

// アイコンを取得
function getIcon(item) {
    if (item.icon) {
        if (item.icon.type === 'external') {
            return item.icon.external.url;
        } else if (item.icon.type === 'file') {
            return item.icon.file.url;
        }
    }
    return null;
}

// プレースホルダーアイコンを取得
function getPlaceholderIcon(item) {
    if (item.icon && item.icon.type === 'emoji') {
        return item.icon.emoji;
    }
    return '📄';
}

// タイトルを取得
function getTitle(item) {
    const titleProperty = item.properties.Name || item.properties.Title || item.properties.title || item.properties.name;
    
    if (titleProperty) {
        if (titleProperty.type === 'title' && titleProperty.title.length > 0) {
            return titleProperty.title[0].plain_text;
        }
    }
    
    // フォールバック: 最初のプロパティから取得
    for (const key in item.properties) {
        const prop = item.properties[key];
        if (prop.type === 'title' && prop.title.length > 0) {
            return prop.title[0].plain_text;
        }
    }
    
    return '無題';
}

// プロパティを取得
function getProperties(item) {
    const properties = {
        description: '',
        tags: []
    };
    
    // プロパティを走査
    for (const key in item.properties) {
        const prop = item.properties[key];
        
        // 説明（rich_text）
        if (prop.type === 'rich_text' && prop.rich_text.length > 0) {
            properties.description = prop.rich_text[0].plain_text;
        }
        
        // タグ（multi_select）
        if (prop.type === 'multi_select' && prop.multi_select.length > 0) {
            properties.tags = prop.multi_select.map(tag => tag.name);
        }
        
        // セレクト
        if (prop.type === 'select' && prop.select) {
            properties.tags.push(prop.select.name);
        }
    }
    
    return properties;
}

// カードの幅を計算
function calculateCardWidth() {
    const containerWidth = sliderTrack.parentElement.offsetWidth;
    const gap = 24; // gap between cards (1.5rem)
    const totalGap = gap * (itemsPerView - 1);
    const cardWidth = (containerWidth - totalGap) / itemsPerView;
    
    // レスポンシブ調整
    if (window.innerWidth <= 768) {
        return containerWidth - 32; // モバイルは1枚表示
    }
    
    return cardWidth;
}

// スライダーの位置を更新
function updateSliderPosition() {
    const cardWidth = calculateCardWidth();
    const gap = 24;
    const offset = currentIndex * (cardWidth + gap);
    sliderTrack.style.transform = `translateX(-${offset}px)`;
}

// ナビゲーション
function navigate(direction) {
    const maxIndex = Math.max(0, items.length - itemsPerView);
    currentIndex = Math.max(0, Math.min(currentIndex + direction, maxIndex));
    
    updateSliderPosition();
    updateNavigation();
    updatePaginationDots();
}

// ナビゲーションボタンの状態を更新
function updateNavigation() {
    const maxIndex = Math.max(0, items.length - itemsPerView);
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= maxIndex;
}

// ページネーションを作成
function createPagination() {
    pagination.innerHTML = '';
    const maxIndex = Math.max(0, items.length - itemsPerView);
    const totalPages = maxIndex + 1;
    
    for (let i = 0; i <= maxIndex; i++) {
        const dot = document.createElement('div');
        dot.className = 'pagination-dot';
        if (i === currentIndex) {
            dot.classList.add('active');
        }
        
        dot.addEventListener('click', () => {
            currentIndex = i;
            updateSliderPosition();
            updateNavigation();
            updatePaginationDots();
        });
        
        pagination.appendChild(dot);
    }
}

// ページネーションドットを更新
function updatePaginationDots() {
    const dots = pagination.querySelectorAll('.pagination-dot');
    dots.forEach((dot, index) => {
        if (index === currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// エラーを表示
function showError(message) {
    hideAll();
    error.style.display = 'block';
    errorMessage.textContent = message;
}

// すべての表示を隠す
function hideAll() {
    loading.style.display = 'none';
    error.style.display = 'none';
    sliderWrapper.style.display = 'none';
    pagination.style.display = 'none';
}

// ウィンドウリサイズ時の処理
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (items.length > 0) {
            // カードのサイズを再計算
            const cards = sliderTrack.querySelectorAll('.gallery-card');
            const cardWidth = calculateCardWidth();
            cards.forEach(card => {
                card.style.width = `${cardWidth}px`;
            });
            
            // スライダー位置を更新
            updateSliderPosition();
        }
    }, 250);
});

// タッチスワイプ対応
let touchStartX = 0;
let touchEndX = 0;

sliderTrack.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

sliderTrack.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // 左スワイプ（次へ）
            navigate(1);
        } else {
            // 右スワイプ（前へ）
            navigate(-1);
        }
    }
}

// キーボード操作
document.addEventListener('keydown', (e) => {
    if (items.length === 0) return;
    
    if (e.key === 'ArrowLeft') {
        navigate(-1);
    } else if (e.key === 'ArrowRight') {
        navigate(1);
    }
});
