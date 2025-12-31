// ========== Skeleton 로더 컴포넌트 ==========

export function createSkeleton(type = 'post', count = 1) {
    const skeletons = {
        post: () => `
            <div class="skeleton-post">
                <div class="skeleton-header">
                    <div class="skeleton-avatar skeleton-shimmer"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-name skeleton-shimmer"></div>
                        <div class="skeleton-time skeleton-shimmer"></div>
                    </div>
                </div>
                <div class="skeleton-image skeleton-shimmer"></div>
                <div class="skeleton-actions">
                    <div class="skeleton-icon skeleton-shimmer"></div>
                    <div class="skeleton-icon skeleton-shimmer"></div>
                    <div class="skeleton-icon skeleton-shimmer"></div>
                </div>
                <div class="skeleton-text skeleton-shimmer"></div>
                <div class="skeleton-text skeleton-shimmer" style="width: 60%;"></div>
            </div>
        `,
        
        reel: () => `
            <div class="skeleton-reel skeleton-shimmer"></div>
        `,
        
        story: () => `
            <div class="skeleton-story">
                <div class="skeleton-story-avatar skeleton-shimmer"></div>
                <div class="skeleton-story-name skeleton-shimmer"></div>
            </div>
        `,
        
        comment: () => `
            <div class="skeleton-comment">
                <div class="skeleton-avatar skeleton-shimmer"></div>
                <div class="skeleton-comment-body">
                    <div class="skeleton-text skeleton-shimmer"></div>
                    <div class="skeleton-text skeleton-shimmer" style="width: 70%;"></div>
                </div>
            </div>
        `,
        
        profile: () => `
            <div class="skeleton-profile">
                <div class="skeleton-profile-header">
                    <div class="skeleton-profile-avatar skeleton-shimmer"></div>
                    <div class="skeleton-profile-stats">
                        <div class="skeleton-text skeleton-shimmer"></div>
                        <div class="skeleton-text skeleton-shimmer"></div>
                        <div class="skeleton-text skeleton-shimmer"></div>
                    </div>
                </div>
                <div class="skeleton-text skeleton-shimmer"></div>
                <div class="skeleton-text skeleton-shimmer" style="width: 80%;"></div>
            </div>
        `,
        
        chat: () => `
            <div class="skeleton-chat">
                <div class="skeleton-avatar skeleton-shimmer"></div>
                <div class="skeleton-chat-content">
                    <div class="skeleton-text skeleton-shimmer"></div>
                    <div class="skeleton-text skeleton-shimmer" style="width: 50%;"></div>
                </div>
            </div>
        `
    };
    
    const template = skeletons[type] || skeletons.post;
    return Array(count).fill(0).map(() => template()).join('');
}

export function showSkeleton(containerId, type = 'post', count = 3) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = createSkeleton(type, count);
    }
}

export function hideSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

// Skeleton CSS 주입
const skeletonStyles = document.createElement('style');
skeletonStyles.textContent = `
    .skeleton-shimmer {
        background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
    }
    
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    
    .skeleton-post {
        padding: 16px;
        background: white;
        border-radius: 8px;
        margin-bottom: 16px;
    }
    
    .skeleton-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }
    
    .skeleton-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }
    
    .skeleton-info {
        flex: 1;
    }
    
    .skeleton-name {
        height: 14px;
        width: 120px;
        border-radius: 4px;
        margin-bottom: 6px;
    }
    
    .skeleton-time {
        height: 12px;
        width: 80px;
        border-radius: 4px;
    }
    
    .skeleton-image {
        height: 400px;
        border-radius: 8px;
        margin-bottom: 12px;
    }
    
    .skeleton-actions {
        display: flex;
        gap: 16px;
        margin-bottom: 12px;
    }
    
    .skeleton-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
    }
    
    .skeleton-text {
        height: 14px;
        border-radius: 4px;
        margin-bottom: 8px;
    }
    
    .skeleton-reel {
        width: 120px;
        height: 180px;
        border-radius: 12px;
        margin-right: 12px;
    }
    
    .skeleton-story {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-right: 16px;
    }
    
    .skeleton-story-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
    }
    
    .skeleton-story-name {
        width: 60px;
        height: 12px;
        border-radius: 4px;
    }
    
    .skeleton-comment {
        display: flex;
        gap: 12px;
        padding: 12px 0;
    }
    
    .skeleton-comment-body {
        flex: 1;
    }
    
    .skeleton-profile {
        padding: 20px;
    }
    
    .skeleton-profile-header {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 16px;
    }
    
    .skeleton-profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
    }
    
    .skeleton-profile-stats {
        display: flex;
        gap: 24px;
    }
    
    .skeleton-chat {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
    }
    
    .skeleton-chat-content {
        flex: 1;
    }
`;
document.head.appendChild(skeletonStyles);

console.log('✅ Skeleton 컴포넌트 로드 완료');
