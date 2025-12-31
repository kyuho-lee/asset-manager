// ========== 포맷팅 유틸리티 ==========

export function convertHashtagsToLinks(content) {
    if (!content) return '';
    return content.replace(/#([가-힣a-zA-Z0-9_]+)/g, '<span style="color: #0066cc; cursor: pointer;" onclick="searchByHashtag(\'$1\')">#$1</span>');
}

export function formatPrice(price) {
    if (!price) return '-';
    return Number(price).toLocaleString() + '원';
}

export function camelToSnake(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

export function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}
