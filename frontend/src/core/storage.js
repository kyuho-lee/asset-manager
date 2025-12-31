// ========== LocalStorage 관리 ==========

export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Storage 저장 오류:', error);
        return false;
    }
}

export function loadFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Storage 로드 오류:', error);
        return null;
    }
}

export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Storage 삭제 오류:', error);
        return false;
    }
}

export function clearStorage() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Storage 초기화 오류:', error);
        return false;
    }
}

export function getAllStorageKeys() {
    try {
        return Object.keys(localStorage);
    } catch (error) {
        console.error('Storage 키 조회 오류:', error);
        return [];
    }
}

console.log('✅ Storage 모듈 로드 완료');
