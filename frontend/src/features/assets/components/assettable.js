// ========== Asset Table Component ==========
// 자산 목록 테이블 + 페이지네이션 + 검색

import { fetchAssets, deleteAsset } from '../api/assetsApi.js';
import { formatDate, formatNumber, filterAssets, getPaginationData, getPageNumbers } from '../utils/assetutils.js';
import { openEditModal } from './assetform.js';

let allAssets = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentSearchQuery = '';
let currentSearchField = 'all';
let currentFields = [];
let currentColumns = [];
let currentUser = null;

// 테이블 초기화
export function initAssetTable(fields, columns, user) {
    currentFields = fields;
    currentColumns = columns;
    currentUser = user;
}

// 자산 목록 로드
export async function loadAssets(fields, columns, user) {
    currentFields = fields;
    currentColumns = columns;
    currentUser = user;
    
    try {
        allAssets = await fetchAssets();
        renderAssetTable();
        renderPagination();
    } catch (error) {
        console.error('자산 로드 오류:', error);
        alert('자산 목록을 불러오는데 실패했습니다.');
    }
}

// 테이블 렌더링
function renderAssetTable() {
    const headerRow = document.getElementById('tableHeader');
    const tbody = document.getElementById('assetTableBody');
    
    if (!headerRow || !tbody) return;
    
    // 검색 필터링
    const filteredAssets = filterAssets(allAssets, currentSearchQuery, currentSearchField);
    
    // 페이지네이션
    const pagination = getPaginationData(filteredAssets, currentPage, itemsPerPage);
    const assets = pagination.currentAssets;
    
    // 테이블 헤더
    let headerHtml = '';
    for (let i = 0; i < currentColumns.length; i++) {
        const col = currentColumns[i];
        headerHtml += '<th style="min-width: ' + col.width + 'px;">' + col.name + '</th>';
    }
    headerRow.innerHTML = headerHtml;
    
    // 테이블 바디
    if (assets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + currentColumns.length + '" style="text-align: center; padding: 60px; color: #999;">📦 등록된 자산이 없습니다.</td></tr>';
        return;
    }
    
    let bodyHtml = '';
    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const rowNum = pagination.startIndex + i + 1;
        
        bodyHtml += '<tr onclick="window.assetsFeature.openEditModal(' + asset.id + ')">';
        
        for (let j = 0; j < currentColumns.length; j++) {
            const col = currentColumns[j];
            let value = '';
            
            if (col.key === 'no') {
                value = rowNum;
            } else if (col.key === 'registerDate') {
                value = formatDate(asset.register_date || asset.created_at);
            } else if (col.key === 'actions') {
                // 권한 체크
                const canDelete = currentUser && (currentUser.permissions.registerAssets || currentUser.role === 'admin');
                if (canDelete) {
                    value = '<button onclick="event.stopPropagation(); window.assetsFeature.deleteAsset(' + asset.id + ')" class="btn-delete">삭제</button>';
                } else {
                    value = '-';
                }
            } else {
                const fieldConfig = currentFields.find(f => f.key === col.key);
                if (fieldConfig && fieldConfig.type === 'number') {
                    value = formatNumber(asset[col.key]);
                } else {
                    value = asset[col.key] || '-';
                }
            }
            
            bodyHtml += '<td>' + value + '</td>';
        }
        
        bodyHtml += '</tr>';
    }
    
    tbody.innerHTML = bodyHtml;
    
    // 페이지네이션 렌더링
    renderPagination();
}

// 페이지네이션 렌더링
function renderPagination() {
    const container = document.getElementById('paginationContainer');
    if (!container) return;
    
    const filteredAssets = filterAssets(allAssets, currentSearchQuery, currentSearchField);
    const pagination = getPaginationData(filteredAssets, currentPage, itemsPerPage);
    
    if (pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const pages = getPageNumbers(currentPage, pagination.totalPages);
    
    let html = '<div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">';
    
    // 첫 페이지
    if (currentPage > 1) {
        html += '<button onclick="window.assetsFeature.goToPage(1)" style="padding: 8px 12px; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px;">«</button>';
        html += '<button onclick="window.assetsFeature.goToPage(' + (currentPage - 1) + ')" style="padding: 8px 12px; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px;">‹</button>';
    }
    
    // 페이지 번호
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        
        if (page === '...') {
            html += '<span style="padding: 8px; color: #999;">...</span>';
        } else {
            const isActive = page === currentPage;
            const bgColor = isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white';
            const textColor = isActive ? 'white' : '#333';
            const borderColor = isActive ? 'transparent' : '#ddd';
            
            html += '<button onclick="window.assetsFeature.goToPage(' + page + ')" style="padding: 8px 12px; background: ' + bgColor + '; color: ' + textColor + '; border: 1px solid ' + borderColor + '; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: ' + (isActive ? '600' : '400') + ';">' + page + '</button>';
        }
    }
    
    // 마지막 페이지
    if (currentPage < pagination.totalPages) {
        html += '<button onclick="window.assetsFeature.goToPage(' + (currentPage + 1) + ')" style="padding: 8px 12px; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px;">›</button>';
        html += '<button onclick="window.assetsFeature.goToPage(' + pagination.totalPages + ')" style="padding: 8px 12px; background: white; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-size: 14px;">»</button>';
    }
    
    html += '</div>';
    
    // 정보 표시
    html += '<div style="text-align: center; margin-top: 15px; color: #666; font-size: 14px;">';
    html += '전체 ' + pagination.totalItems + '개 중 ' + (pagination.startIndex + 1) + '-' + Math.min(pagination.endIndex, pagination.totalItems) + '번째 표시';
    html += '</div>';
    
    container.innerHTML = html;
}

// 페이지 이동
export function goToPage(page) {
    currentPage = page;
    renderAssetTable();
    renderPagination();
}

// 검색
export function searchAssets(query, field) {
    currentSearchQuery = query;
    currentSearchField = field || 'all';
    currentPage = 1;
    renderAssetTable();
    renderPagination();
}

// 검색 초기화
export function resetSearch() {
    currentSearchQuery = '';
    currentSearchField = 'all';
    currentPage = 1;
    
    const searchInput = document.getElementById('searchInput');
    const searchFieldSelect = document.getElementById('searchField');
    
    if (searchInput) searchInput.value = '';
    if (searchFieldSelect) searchFieldSelect.value = 'all';
    
    renderAssetTable();
    renderPagination();
}

// 자산 삭제
export async function handleDeleteAsset(id) {
    if (!confirm('정말로 이 자산을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await deleteAsset(id);
        alert('✅ 자산이 삭제되었습니다.');
        
        // 목록 새로고침
        await loadAssets(currentFields, currentColumns, currentUser);
        
    } catch (error) {
        alert('❌ 자산 삭제에 실패했습니다: ' + error.message);
    }
}

// 자산 ID로 찾기
export function getAssetById(id) {
    return allAssets.find(asset => asset.id === id);
}

console.log('✅ Asset Table Component 로드 완료');