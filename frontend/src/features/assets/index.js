// ========== Assets Feature ==========
// 자산 관리 Feature 메인 진입점

import { getFieldSettings, getColumnSettings } from './api/assetsapi.js';

import {
    renderAssetForm,
    resetForm,
    openEditModal,
    handleEditSubmit,
    closeEditModal,
    initAssetForm
} from './components/assetform.js';

import {
    loadAssets,
    goToPage,
    searchAssets,
    resetSearch,
    handleDeleteAsset,
    getAssetById,
    initAssetTable
} from './components/assettable.js';

import {
    openFieldSettingsModal,
    closeFieldSettingsModal,
    addNewField,
    editFieldFromModal,
    deleteFieldFromModal,
    saveFieldSettingsModal,
    initFieldSettings
} from './components/fieldsettings.js';

import {
    downloadExcel,
    downloadExcelTemplate,
    showExcelUploadModal,
    processExcelUpload,
    closeExcelUploadModal,
    initExcelUpload
} from './components/excelupload.js';

import {
    loadDashboard,
    generateChart,
    renderChartControls,
    updateChart
} from './components/dashboard.js';

// ========== 전역 상태 ==========
let currentFields = [];
let currentColumns = [];
let currentUser = null;

// ========== 초기화 ==========
export async function init(user) {
    currentUser = user;
    
    console.log('🚀 Assets Feature 초기화 시작...');
    
    try {
        // 필드/컬럼 설정 로드
        currentFields = await getFieldSettings();
        currentColumns = await getColumnSettings();
        
        console.log('✅ 필드 설정 로드:', currentFields.length + '개');
        console.log('✅ 컬럼 설정 로드:', currentColumns.length + '개');
        
        // 각 컴포넌트 초기화
        initAssetForm(currentFields, onFormSubmit);
        initAssetTable(currentFields, currentColumns, currentUser);
        initFieldSettings(onFieldsChange);
        initExcelUpload(onExcelUpload);
        
        console.log('✅ Assets Feature 초기화 완료!');
        
    } catch (error) {
        console.error('❌ Assets Feature 초기화 오류:', error);
    }
}

// ========== 콜백 함수 ==========

// 폼 제출 후 콜백
async function onFormSubmit() {
    await loadAssets(currentFields, currentColumns, currentUser);
}

// 필드 설정 변경 후 콜백
async function onFieldsChange() {
    currentFields = await getFieldSettings();
    currentColumns = await getColumnSettings();
    
    renderAssetForm(currentFields);
    await loadAssets(currentFields, currentColumns, currentUser);
}

// 엑셀 업로드 후 콜백
async function onExcelUpload() {
    await loadAssets(currentFields, currentColumns, currentUser);
}

// ========== 페이지 렌더링 ==========

// 등록 페이지
export async function renderRegisterPage() {
    currentFields = await getFieldSettings();
    renderAssetForm(currentFields);
}

// 목록 페이지
export async function renderListPage() {
    currentFields = await getFieldSettings();
    currentColumns = await getColumnSettings();
    
    // 검색 필드 드롭다운 초기화 (HTML에 이미 검색 UI 존재)
    initSearchFields();
    
    // 테이블 로드
    await loadAssets(currentFields, currentColumns, currentUser);
}

// 대시보드 페이지
export async function renderDashboardPage() {
    currentFields = await getFieldSettings();
    
    renderChartControls(currentFields);
    await loadDashboard();
}

// ========== 검색 필드 초기화 ==========
function initSearchFields() {
    const searchField = document.getElementById('searchField');
    if (!searchField) return;
    
    // 필드 옵션 추가 (전체는 HTML에 이미 있음)
    let html = '<option value="">전체</option>';
    for (let i = 0; i < currentFields.length; i++) {
        html += '<option value="' + currentFields[i].key + '">' + currentFields[i].name + '</option>';
    }
    
    searchField.innerHTML = html;
}

// 검색 처리
function handleSearch() {
    const query = document.getElementById('searchInput').value;
    const field = document.getElementById('searchField').value;
    searchAssets(query, field);
}

// ========== 수정 모달 핸들러 ==========

// 자산 ID로 수정 모달 열기
function openEditModalById(assetId) {
    const asset = getAssetById(assetId);
    if (asset) {
        openEditModal(asset, currentFields);
    }
}

// ========== 전역 노출 (window.assetsFeature) ==========

const assetsFeature = {
    // 초기화
    init,
    
    // 페이지 렌더링
    renderRegisterPage,
    renderListPage,
    renderDashboardPage,
    
    // 폼
    resetForm,
    handleEditSubmit,
    closeEditModal,
    openEditModal: openEditModalById,
    
    // 테이블
    goToPage,
    handleSearch,
    resetSearch,
    deleteAsset: handleDeleteAsset,
    
    // 필드 설정
    openFieldSettingsModal,
    closeFieldSettingsModal,
    addNewField,
    editFieldFromModal,
    deleteFieldFromModal,
    saveFieldSettingsModal,
    
    // 엑셀
    downloadExcel: () => downloadExcel(currentFields),
    downloadExcelTemplate: () => downloadExcelTemplate(currentFields),
    showExcelUploadModal,
    processExcelUpload: () => processExcelUpload(currentFields),
    closeExcelUploadModal,
    
    // 차트
    updateChart
};

// 전역으로 노출
window.assetsFeature = assetsFeature;

console.log('✅ Assets Feature 모듈 로드 완료');

export default assetsFeature;