// ========== Pagination 컴포넌트 ==========

export function createPagination(containerId, totalPages, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    let html = '<div class="pagination">';
    
    // 이전 버튼
    html += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                ${currentPage === 1 ? 'disabled' : ''} 
                onclick="(${onPageChange})(${currentPage - 1})">
            ‹
        </button>
    `;
    
    // 첫 페이지
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="(${onPageChange})(1)">1</button>`;
        if (startPage > 2) {
            html += '<span class="pagination-dots">...</span>';
        }
    }
    
    // 페이지 번호들
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="(${onPageChange})(${i})">
                ${i}
            </button>
        `;
    }
    
    // 마지막 페이지
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="pagination-dots">...</span>';
        }
        html += `<button class="pagination-btn" onclick="(${onPageChange})(${totalPages})">${totalPages}</button>`;
    }
    
    // 다음 버튼
    html += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="(${onPageChange})(${currentPage + 1})">
            ›
        </button>
    `;
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Pagination CSS
const paginationStyles = document.createElement('style');
paginationStyles.textContent = `
    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin: 20px 0;
    }
    
    .pagination-btn {
        min-width: 36px;
        height: 36px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    }
    
    .pagination-btn:hover:not(.disabled):not(.active) {
        background: #f5f5f5;
        border-color: #999;
    }
    
    .pagination-btn.active {
        background: #0095f6;
        color: white;
        border-color: #0095f6;
    }
    
    .pagination-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .pagination-dots {
        padding: 0 4px;
        color: #999;
    }
`;
document.head.appendChild(paginationStyles);

console.log('✅ Pagination 컴포넌트 로드 완료');
