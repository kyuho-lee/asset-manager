// ========== Debounce Hook ==========

export function useDebounce(inputElement, callback, delay = 300) {
    if (!inputElement) {
        console.warn('Input element not found');
        return null;
    }
    
    let timeoutId;
    
    function handleInput(e) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            callback(e.target.value, e);
        }, delay);
    }
    
    inputElement.addEventListener('input', handleInput);
    
    return {
        destroy: () => {
            clearTimeout(timeoutId);
            inputElement.removeEventListener('input', handleInput);
        }
    };
}

console.log('✅ Debounce Hook 로드 완료');
