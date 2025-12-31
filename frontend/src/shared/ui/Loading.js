// ========== Loading Spinner 컴포넌트 ==========

export function showLoading(containerId = null, text = '로딩 중...') {
    const spinner = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            ${text ? `<div class="loading-text">${text}</div>` : ''}
        </div>
    `;
    
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = spinner;
        }
    } else {
        // 전체 화면 로딩
        let overlay = document.getElementById('global-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-loading-overlay';
            overlay.className = 'loading-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = spinner;
        overlay.style.display = 'flex';
    }
}

export function hideLoading(containerId = null) {
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    } else {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

export function showButtonLoading(buttonElement, loadingText = '처리 중...') {
    if (!buttonElement) return;
    
    buttonElement.disabled = true;
    buttonElement.dataset.originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = `
        <span class="button-spinner"></span>
        ${loadingText}
    `;
}

export function hideButtonLoading(buttonElement) {
    if (!buttonElement) return;
    
    buttonElement.disabled = false;
    buttonElement.innerHTML = buttonElement.dataset.originalText || '확인';
}

// Loading CSS
const loadingStyles = document.createElement('style');
loadingStyles.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }
    
    .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .loading-text {
        color: white;
        font-size: 14px;
    }
    
    .button-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(loadingStyles);

console.log('✅ Loading 컴포넌트 로드 완료');
