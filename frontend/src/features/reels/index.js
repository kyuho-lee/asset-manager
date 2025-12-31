// ========== Reels Feature ==========
import * as reelsApi from './api/reelsApi.js';
import { renderReelCard } from './components/ReelViewer.js';

let currentUser = null;
let reelsPage = 1;
let reelsLoading = false;
let selectedReelFiles = [];

// Reels 초기화
export function initReels() {
    console.log('✅ Reels 초기화');
    
    // 전역 함수 등록
    window.toggleReelLike = toggleReelLike;
    window.toggleReelPlay = toggleReelPlay;
    window.deleteReel = deleteReel;
    window.openReelComments = openReelComments;
    
    // 릴스 업로드 버튼
    const uploadReelBtn = document.getElementById('uploadReelBtn');
    if (uploadReelBtn) {
        uploadReelBtn.addEventListener('click', uploadReel);
    }
    
    // 릴스 파일 선택
    const reelFileInput = document.getElementById('reelFileInput');
    if (reelFileInput) {
        reelFileInput.addEventListener('change', handleReelFiles);
    }
}

// Reels 로드
export async function loadReels() {
    if (reelsLoading) return;
    reelsLoading = true;
    
    const container = document.getElementById('reelsList');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 20px; color: white;">로딩 중...</p>';
    
    try {
        const response = await reelsApi.loadReels(reelsPage, 20);
        const reels = response.data || [];
        
        if (reels.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 릴스가 없습니다.</p>';
            reelsLoading = false;
            return;
        }
        
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        container.innerHTML = '';
        for (let i = 0; i < reels.length; i++) {
            container.innerHTML += renderReelCard(reels[i], currentUser);
            
            // 비디오 자동 재생
            if (reels[i].media_type === 'video') {
                setTimeout(function() {
                    const video = document.getElementById('reel-video-' + reels[i].id);
                    if (video) {
                        video.play().catch(function(err) {
                            console.log('자동 재생 실패:', err);
                        });
                    }
                }, 100);
            }
            
            // 조회수 증가
            reelsApi.incrementReelView(reels[i].id).catch(console.error);
        }
        
    } catch (error) {
        console.error('릴스 로드 오류:', error);
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">릴스를 불러오는 중 오류가 발생했습니다.</p>';
    }
    
    reelsLoading = false;
}

// 파일 선택 처리
function handleReelFiles(event) {
    const files = Array.from(event.target.files);
    
    if (files.length > 10) {
        alert('최대 10개까지 업로드 가능합니다.');
        return;
    }
    
    selectedReelFiles = files;
    
    // 미리보기 표시
    const previewContainer = document.getElementById('reelPreview');
    if (!previewContainer) return;
    
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = '';
    
    files.forEach(function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 2px solid #e0e0e0;';
            
            const isVideo = file.type.startsWith('video/');
            const element = isVideo ? document.createElement('video') : document.createElement('img');
            element.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            element.src = e.target.result;
            if (isVideo) element.controls = true;
            
            wrapper.appendChild(element);
            previewContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });
}

// 릴스 업로드
async function uploadReel() {
    if (selectedReelFiles.length === 0) {
        alert('📸 파일을 선택해주세요!');
        return;
    }
    
    const caption = document.getElementById('reelCaption');
    const captionText = caption ? caption.value.trim() : '';
    
    try {
        const formData = new FormData();
        formData.append('caption', captionText);
        
        selectedReelFiles.forEach(function(file) {
            formData.append('media', file);
        });
        
        const result = await reelsApi.uploadReel(formData);
        
        if (result.success) {
            if (caption) caption.value = '';
            document.getElementById('reelFileInput').value = '';
            selectedReelFiles = [];
            const preview = document.getElementById('reelPreview');
            if (preview) preview.style.display = 'none';
            
            alert('릴스가 업로드되었습니다! 🎉');
            await loadReels();
        }
    } catch (error) {
        console.error('릴스 업로드 오류:', error);
        alert('릴스 업로드 중 오류가 발생했습니다.');
    }
}

// 좋아요 토글
async function toggleReelLike(reelId) {
    try {
        const response = await reelsApi.toggleReelLike(reelId);
        
        if (response.success) {
            // UI 업데이트
            const reelCard = document.getElementById('reel-' + reelId);
            if (reelCard) {
                const likeBtn = reelCard.querySelector('button[onclick*="toggleReelLike"]');
                if (likeBtn) {
                    likeBtn.innerHTML = response.liked ? '❤️' : '🤍';
                    likeBtn.style.color = response.liked ? '#ff4444' : 'white';
                }
                
                const likeCount = reelCard.querySelector('span');
                if (likeCount && likeCount.textContent.includes('❤️')) {
                    likeCount.textContent = '❤️ ' + (response.likeCount || 0);
                }
            }
        }
    } catch (error) {
        console.error('릴스 좋아요 오류:', error);
    }
}

// 비디오 재생/정지
function toggleReelPlay(reelId) {
    const video = document.getElementById('reel-video-' + reelId);
    const playBtn = document.getElementById('reel-play-btn-' + reelId);
    
    if (!video) return;
    
    if (video.paused) {
        video.play();
        if (playBtn) playBtn.style.display = 'none';
    } else {
        video.pause();
        if (playBtn) playBtn.style.display = 'flex';
    }
}

// 릴스 삭제
async function deleteReel(reelId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const response = await reelsApi.deleteReel(reelId);
        
        if (response.success) {
            alert('릴스가 삭제되었습니다.');
            await loadReels();
        }
    } catch (error) {
        console.error('릴스 삭제 오류:', error);
    }
}

// 댓글 열기
function openReelComments(reelId) {
    window.dispatchEvent(new CustomEvent('comments:open', { detail: reelId }));
}

console.log('✅ Reels feature 로드 완료');
