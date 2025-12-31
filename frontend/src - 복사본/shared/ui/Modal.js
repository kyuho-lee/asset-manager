// ========== Modal 컴포넌트 ==========

export function createModal(id, title = '', content = '', options = {}) {
    const {
        width = '500px',
        height = 'auto',
        showCloseButton = true,
        closeOnBackdrop = true,
        onClose = null
    } = options;

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.style.display = 'none';
    
    modal.innerHTML = `
        <div class="modal-overlay" ${closeOnBackdrop ? 'onclick="closeModal(\'' + id + '\')"' : ''}></div>
        <div class="modal-content" style="width: ${width}; height: ${height};">
            ${title ? `
                <div class="modal-header">
                    <h3>${title}</h3>
                    ${showCloseButton ? '<button class="modal-close" onclick="closeModal(\'' + id + '\')">&times;</button>' : ''}
                </div>
            ` : ''}
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 닫기 함수 등록
    window['closeModal_' + id] = function() {
        closeModal(id);
        if (onClose) onClose();
    };
    
    return modal;
}

export function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

export function updateModalContent(id, content) {
    const modal = document.getElementById(id);
    if (modal) {
        const body = modal.querySelector('.modal-body');
        if (body) body.innerHTML = content;
    }
}

export function removeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.remove();
        delete window['closeModal_' + id];
    }
}

// 전역 함수로 등록 (기존 코드 호환)
window.showModal = showModal;
window.closeModal = closeModal;

console.log('✅ Modal 컴포넌트 로드 완료');
