// ========== Intersection Observer Hook ==========

export function useIntersectionObserver(targetSelector, callback, options = {}) {
    const {
        threshold = 0.1,
        rootMargin = '0px',
        once = false
    } = options;
    
    const observerOptions = {
        root: null,
        rootMargin,
        threshold
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                callback(entry.target, entry);
                
                if (once) {
                    observer.unobserve(entry.target);
                }
            }
        });
    }, observerOptions);
    
    // 초기 타겟 관찰
    function observe(elements) {
        if (!elements) return;
        
        if (typeof elements === 'string') {
            elements = document.querySelectorAll(elements);
        }
        
        if (elements instanceof Element) {
            observer.observe(elements);
        } else if (elements.length) {
            elements.forEach(el => observer.observe(el));
        }
    }
    
    // 초기 실행
    if (targetSelector) {
        observe(targetSelector);
    }
    
    return {
        observe,
        unobserve: (element) => observer.unobserve(element),
        disconnect: () => observer.disconnect()
    };
}

console.log('✅ IntersectionObserver Hook 로드 완료');
