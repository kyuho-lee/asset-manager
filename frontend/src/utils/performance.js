// ========== 성능 최적화 유틸리티 ==========

export function debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

export function throttle(func, delay = 300) {
    let lastCall = 0;
    return function(...args) {
        const now = new Date().getTime();
        if (now - lastCall < delay) {
            return;
        }
        lastCall = now;
        return func.apply(this, args);
    };
}

export function once(func) {
    let called = false;
    let result;
    return function(...args) {
        if (!called) {
            called = true;
            result = func.apply(this, args);
        }
        return result;
    };
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry(func, maxRetries = 3, delay = 1000) {
    return async function(...args) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await func.apply(this, args);
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await sleep(delay);
                }
            }
        }
        throw lastError;
    };
}

console.log('✅ 성능 최적화 유틸리티 로드 완료');
