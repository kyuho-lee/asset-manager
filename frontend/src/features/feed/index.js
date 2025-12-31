// ========== Feed Feature ==========
import * as feedApi from './api/feedApi.js';
import { renderPostCard } from './components/PostCard.js';
import { getTimeAgo, convertHashtagsToLinks, displayPostImagePreviews } from './utils/feedUtils.js';

let feedPage = 1;
let feedLoading = false;
let hasMorePosts = true;
let selectedPostImages = [];
let currentUser = null;

// Feed 초기화
export function initFeed() {
    console.log('✅ Feed 초기화');
    
    // 전역 함수 등록 (기존 호환성)
    window.toggleLike = toggleLike;
    window.toggleBookmark = toggleBookmark;
    window.openCommentModal = openCommentModal;
    window.togglePostMenu = togglePostMenu;
    window.editPostInFeed = editPostInFeed;
    window.deletePost = deletePost;
    window.searchByHashtag = searchByHashtag;
    window.prevPostImage = prevPostImage;
    window.nextPostImage = nextPostImage;
    
    // 이미지 선택 이벤트
    const imageInput = document.getElementById('postImageInput');
    if (imageInput) {
        imageInput.addEventListener('change', handlePostImages);
    }
    
    // 게시물 작성 버튼
    const createPostBtn = document.getElementById('createPostBtn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', createPost);
    }
    
    // 더보기 버튼
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMorePosts);
    }
    
    // 이미지 제거 이벤트
    window.addEventListener('feed:removeImage', function(e) {
        selectedPostImages.splice(e.detail, 1);
        displayPostImagePreviews(selectedPostImages, 'postImagePreview');
    });
}

// Feed 로드
export async function loadFeed() {
    feedPage = 1;
    hasMorePosts = true;
    await loadPosts(true);
}

// 게시물 로드
async function loadPosts(reset) {
    if (feedLoading) return;
    feedLoading = true;
    
    const container = document.getElementById('feedList');
    if (!container) return;
    
    if (reset) container.innerHTML = '<p style="text-align: center; padding: 20px;">로딩 중...</p>';
    
    try {
        const response = await feedApi.loadFeed(feedPage, 10);
        const posts = response.data || [];
        const pagination = response.pagination;
        
        if (reset) container.innerHTML = '';
        
        if (posts.length === 0 && feedPage === 1) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 게시물이 없습니다.</p>';
            document.getElementById('loadMoreArea').style.display = 'none';
            feedLoading = false;
            return;
        }
        
        // 현재 사용자 가져오기
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        for (let i = 0; i < posts.length; i++) {
            container.innerHTML += renderPostCard(posts[i], currentUser);
        }
        
        // 더보기 버튼
        if (pagination && feedPage < pagination.totalPages) {
            document.getElementById('loadMoreArea').style.display = 'block';
            hasMorePosts = true;
        } else {
            document.getElementById('loadMoreArea').style.display = 'none';
            hasMorePosts = false;
        }
        
    } catch (error) {
        console.error('피드 로드 오류:', error);
    }
    
    feedLoading = false;
}

// 더보기
async function loadMorePosts() {
    if (!hasMorePosts || feedLoading) return;
    feedPage++;
    await loadPosts(false);
}

// 이미지 선택
function handlePostImages(event) {
    const files = Array.from(event.target.files);
    
    if (files.length > 10) {
        alert('최대 10장까지 업로드 가능합니다.');
        return;
    }
    
    selectedPostImages = files;
    displayPostImagePreviews(files, 'postImagePreview');
}

// 게시물 작성
async function createPost() {
    if (selectedPostImages.length === 0) {
        alert('📸 이미지를 최소 1장 이상 선택해주세요!');
        return;
    }
    
    const content = document.getElementById('newPostContent').value.trim();
    
    try {
        const formData = new FormData();
        formData.append('content', content);
        
        selectedPostImages.forEach(function(file) {
            formData.append('images', file);
        });
        
        const result = await feedApi.createPost(formData);
        
        if (result.success) {
            document.getElementById('newPostContent').value = '';
            document.getElementById('postImageInput').value = '';
            selectedPostImages = [];
            displayPostImagePreviews([], 'postImagePreview');
            
            await loadFeed();
            alert('게시물이 작성되었습니다! 🎉');
        }
    } catch (error) {
        console.error('게시물 작성 오류:', error);
        alert('게시물 작성 중 오류가 발생했습니다.');
    }
}

// 좋아요 토글
async function toggleLike(postId) {
    try {
        const response = await feedApi.toggleLike(postId);
        
        if (response.success) {
            const likeCountEl = document.getElementById('like-count-' + postId);
            if (likeCountEl) {
                likeCountEl.textContent = response.likeCount || 0;
            }
            
            const postCard = document.getElementById('post-' + postId);
            if (postCard) {
                const likeBtn = postCard.querySelector('button[onclick*="toggleLike(' + postId + ')"]');
                if (likeBtn) {
                    likeBtn.innerHTML = response.liked ? '❤️ <span id="like-count-' + postId + '">' + response.likeCount + '</span>' : '🤍 <span id="like-count-' + postId + '">' + response.likeCount + '</span>';
                    likeBtn.style.color = response.liked ? '#ff4444' : '#666';
                }
            }
        }
    } catch (error) {
        console.error('좋아요 오류:', error);
    }
}

// 북마크 토글
async function toggleBookmark(postId) {
    try {
        const response = await feedApi.toggleBookmark(postId);
        
        if (response.success) {
            const btn = document.getElementById('bookmark-btn-' + postId);
            if (btn) {
                btn.innerHTML = response.bookmarked ? '🔖' : '📑';
                btn.style.color = response.bookmarked ? '#0066cc' : '#666';
            }
        }
    } catch (error) {
        console.error('북마크 오류:', error);
    }
}

// 댓글 모달 열기
function openCommentModal(postId) {
    window.dispatchEvent(new CustomEvent('comments:open', { detail: postId }));
}

// 게시물 메뉴 토글
function togglePostMenu(postId) {
    const menu = document.getElementById('postMenu-' + postId);
    if (!menu) return;
    
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// 게시물 수정
function editPostInFeed(postId) {
    const menu = document.getElementById('postMenu-' + postId);
    if (menu) menu.style.display = 'none';
    
    const newContent = prompt('게시물 내용 수정:');
    if (newContent !== null && newContent.trim() !== '') {
        updatePost(postId, newContent.trim());
    }
}

// 게시물 업데이트
async function updatePost(postId, newContent) {
    try {
        const response = await feedApi.updatePost(postId, newContent);
        
        if (response.success) {
            alert('게시물이 수정되었습니다.');
            await loadFeed();
        }
    } catch (error) {
        console.error('게시물 수정 오류:', error);
    }
}

// 게시물 삭제
async function deletePost(postId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const response = await feedApi.deletePost(postId);
        
        if (response.success) {
            alert('게시물이 삭제되었습니다.');
            await loadFeed();
        }
    } catch (error) {
        console.error('게시물 삭제 오류:', error);
    }
}

// 해시태그 검색
async function searchByHashtag(tag) {
    try {
        const response = await feedApi.searchByHashtag(tag);
        const posts = response.data || [];
        
        const container = document.getElementById('feedList');
        let html = '<div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px;">';
        html += '<span style="font-weight: 600; color: #0066cc;">#' + tag + ' 검색 결과 (' + posts.length + '개)</span>';
        html += '</div>';
        
        if (posts.length === 0) {
            html += '<p style="text-align: center; color: #999; padding: 40px;">해당 해시태그의 게시물이 없습니다.</p>';
        } else {
            for (let i = 0; i < posts.length; i++) {
                html += renderPostCard(posts[i], currentUser);
            }
        }
        
        container.innerHTML = html;
        document.getElementById('loadMoreArea').style.display = 'none';
        
    } catch (error) {
        console.error('해시태그 검색 오류:', error);
    }
}

// 이미지 네비게이션
function prevPostImage(postId, event) {
    event.stopPropagation();
    const container = document.getElementById('post-media-' + postId);
    if (!container) return;
    
    const media = JSON.parse(container.getAttribute('data-media'));
    let currentIndex = parseInt(container.getAttribute('data-index'));
    
    if (currentIndex > 0) {
        currentIndex--;
        container.setAttribute('data-index', currentIndex);
        updatePostImage(postId, currentIndex, media);
    }
}

function nextPostImage(postId, event) {
    event.stopPropagation();
    const container = document.getElementById('post-media-' + postId);
    if (!container) return;
    
    const media = JSON.parse(container.getAttribute('data-media'));
    let currentIndex = parseInt(container.getAttribute('data-index'));
    
    if (currentIndex < media.length - 1) {
        currentIndex++;
        container.setAttribute('data-index', currentIndex);
        updatePostImage(postId, currentIndex, media);
    }
}

function updatePostImage(postId, index, media) {
    const img = document.getElementById('post-img-' + postId);
    if (img) {
        img.style.opacity = '0';
        setTimeout(function() {
            img.src = media[index];
            img.style.opacity = '1';
        }, 150);
    }
    
    const dots = document.querySelectorAll('.post-dot-' + postId);
    dots.forEach((dot, i) => {
        dot.style.background = i === index ? 'white' : 'rgba(255,255,255,0.4)';
    });
}

console.log('✅ Feed feature 로드 완료');
