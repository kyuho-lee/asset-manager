// ========== Toast 알림 컴포넌트 ==========

let toastContainer = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.style.cssText = `
        background: white;
        border-left: 4px solid ${colors[type] || colors.info};
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    toast.innerHTML = `
        <span style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${colors[type] || colors.info};
            color: white;
            font-weight: bold;
            font-size: 14px;
        ">${icons[type] || icons.info}</span>
        <span style="flex: 1; color: #333; font-size: 14px;">${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: #999;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            line-height: 1;
        ">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // 자동 제거
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

export function showSuccessToast(message, duration = 3000) {
    return showToast(message, 'success', duration);
}

export function showErrorToast(message, duration = 3000) {
    return showToast(message, 'error', duration);
}

export function showWarningToast(message, duration = 3000) {
    return showToast(message, 'warning', duration);
}

export function showInfoToast(message, duration = 3000) {
    return showToast(message, 'info', duration);
}

export function clearAllToasts() {
    if (toastContainer) {
        toastContainer.innerHTML = '';
    }
}

// 애니메이션 CSS 주입
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Toast 컴포넌트 로드 완료');
