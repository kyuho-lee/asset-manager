// ========== Feed Utils ==========

// 시간 표시 (몇 분 전, 몇 시간 전)
export function getTimeAgo(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 604800) return Math.floor(diff / 86400) + '일 전';
    
    return date.getFullYear() + '.' + (date.getMonth() + 1) + '.' + date.getDate();
}

// 해시태그 링크 변환
export function convertHashtagsToLinks(content) {
    if (!content) return '';
    return content.replace(/#([가-힣a-zA-Z0-9_]+)/g, '<span style="color: #0066cc; cursor: pointer;" onclick="window.searchByHashtag(\'$1\')">#$1</span>');
}

// 이미지 미리보기 표시
export function displayPostImagePreviews(files, containerId) {
    const container = document.getElementById(containerId);
    if (!container || files.length === 0) {
        if (container) container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    const imageList = container.querySelector('.image-list');
    if (!imageList) return;
    
    imageList.innerHTML = '';
    
    files.forEach(function(file, index) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 2px solid #e0e0e0;';
            
            const isVideo = file.type.startsWith('video/');
            const mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
            mediaElement.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            mediaElement.src = e.target.result;
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 18px; line-height: 1;';
            removeBtn.onclick = function() {
                window.dispatchEvent(new CustomEvent('feed:removeImage', { detail: index }));
            };
            
            wrapper.appendChild(mediaElement);
            wrapper.appendChild(removeBtn);
            imageList.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });
}

console.log('✅ Feed Utils 로드됨');
