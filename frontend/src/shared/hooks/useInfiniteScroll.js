// ========== Infinite Scroll Hook ==========

export function useInfiniteScroll(containerId, callback, options = {}) {
    const {
        threshold = 200,
        enabled = true
    } = options;
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Container not found:', containerId);
        return null;
    }
    
    let isLoading = false;
    let hasMore = true;
    
    function handleScroll() {
        if (!enabled || isLoading || !hasMore) return;
        
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        if (scrollTop + clientHeight >= scrollHeight - threshold) {
            isLoading = true;
            callback()
                .then(() => {
                    isLoading = false;
                })
                .catch(error => {
                    console.error('Infinite scroll error:', error);
                    isLoading = false;
                });
        }
    }
    
    container.addEventListener('scroll', handleScroll);
    
    return {
        setLoading: (loading) => { isLoading = loading; },
        setHasMore: (more) => { hasMore = more; },
        destroy: () => {
            container.removeEventListener('scroll', handleScroll);
        }
    };
}

console.log('✅ InfiniteScroll Hook 로드 완료');
