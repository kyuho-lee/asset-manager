// ========== Asset Form Component ==========
// 자산 등록/수정 폼

import { createAsset, updateAsset } from '../api/assetsapi.js';
import { formatDate, validateAssetData, convertKeysToSnakeCase } from '../utils/assetutils.js';

let currentFields = [];
let currentEditIndex = null;
let onFormSubmitCallback = null;

// 폼 초기화
export function initAssetForm(fields, onSubmitCallback) {
    currentFields = fields;
    onFormSubmitCallback = onSubmitCallback;
}

// 등록 폼 렌더링
export function renderAssetForm(fields) {
    currentFields = fields;
    
    // 기존 HTML 구조 사용: basicInfoGrid, additionalInfoGrid
    const basicGrid = document.getElementById('basicInfoGrid');
    const additionalGrid = document.getElementById('additionalInfoGrid');
    
    if (!basicGrid || !additionalGrid) return;
    
    // 기본 필드 (처음 4개)
    let basicHtml = '';
    for (let i = 0; i < Math.min(4, fields.length); i++) {
        basicHtml += renderFieldInput(fields[i]);
    }
    basicGrid.innerHTML = basicHtml;
    
    // 추가 필드 (나머지)
    let additionalHtml = '';
    for (let i = 4; i < fields.length; i++) {
        additionalHtml += renderFieldInput(fields[i]);
    }
    additionalGrid.innerHTML = additionalHtml;
    
    // 폼 제출 이벤트
    const form = document.getElementById('assetForm');
    if (form) {
        form.onsubmit = handleAssetSubmit;
    }
}

// 필드 input HTML 생성
function renderFieldInput(field) {
    const isRequired = field.required ? 'required' : '';
    const requiredMark = field.required ? '<span style="color: red;">*</span>' : '';
    
    let html = '<div class="form-field">';
    html += '<label>' + field.name + ' ' + requiredMark + '</label>';
    
    if (field.type === 'date') {
        const today = formatDate();
        html += '<input type="date" id="' + field.key + '" value="' + today + '" ' + isRequired + '>';
    } else if (field.type === 'number') {
        html += '<input type="number" id="' + field.key + '" placeholder="' + field.name + ' 입력" ' + isRequired + '>';
    } else if (field.type === 'email') {
        html += '<input type="email" id="' + field.key + '" placeholder="' + field.name + ' 입력" ' + isRequired + '>';
    } else if (field.type === 'tel') {
        html += '<input type="tel" id="' + field.key + '" placeholder="' + field.name + ' 입력" ' + isRequired + '>';
    } else {
        html += '<input type="text" id="' + field.key + '" placeholder="' + field.name + ' 입력" ' + isRequired + '>';
    }
    
    html += '</div>';
    return html;
}

// 자산 등록 처리
async function handleAssetSubmit(e) {
    e.preventDefault();
    
    const assetData = {};
    
    // 모든 필드 값 수집
    for (let i = 0; i < currentFields.length; i++) {
        const field = currentFields[i];
        const input = document.getElementById(field.key);
        
        if (input) {
            assetData[field.key] = input.value;
        }
    }
    
    // 유효성 검사
    const validation = validateAssetData(assetData, currentFields);
    if (!validation.isValid) {
        alert(validation.message);
        return;
    }
    
    // snake_case 변환
    const formattedData = convertKeysToSnakeCase(assetData);
    
    try {
        await createAsset(formattedData);
        alert('✅ 자산이 등록되었습니다!');
        
        // 폼 초기화
        resetForm();
        
        // 콜백 실행 (테이블 새로고침)
        if (onFormSubmitCallback) {
            onFormSubmitCallback();
        }
        
    } catch (error) {
        alert('❌ 자산 등록에 실패했습니다: ' + error.message);
    }
}

// 폼 초기화
export function resetForm() {
    const form = document.getElementById('assetForm');
    if (form) {
        form.reset();
        
        // 날짜 필드 오늘로 설정
        for (let i = 0; i < currentFields.length; i++) {
            const field = currentFields[i];
            if (field.type === 'date') {
                const input = document.getElementById(field.key);
                if (input) {
                    input.value = formatDate();
                }
            }
        }
    }
}

// 수정 모달 열기 (HTML에 이미 존재하는 모달 사용)
export function openEditModal(asset, fields) {
    currentFields = fields;
    currentEditIndex = asset.id;
    
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editForm');
    
    if (!modal || !form) return;
    
    // 폼 그리드 영역
    const formGrid = form.querySelector('.form-grid');
    if (!formGrid) {
        // form-grid가 없으면 생성
        const gridDiv = document.createElement('div');
        gridDiv.className = 'form-grid';
        form.appendChild(gridDiv);
    }
    
    const grid = form.querySelector('.form-grid');
    
    // 필드 생성
    let html = '';
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const value = asset[field.key] || '';
        const isRequired = field.required ? 'required' : '';
        const requiredMark = field.required ? '<span style="color: red;">*</span>' : '';
        
        html += '<div class="form-field">';
        html += '<label>' + field.name + ' ' + requiredMark + '</label>';
        
        if (field.type === 'date') {
            const dateValue = value ? formatDate(value) : formatDate();
            html += '<input type="date" id="edit_' + field.key + '" value="' + dateValue + '" ' + isRequired + '>';
        } else if (field.type === 'number') {
            html += '<input type="number" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + '>';
        } else if (field.type === 'email') {
            html += '<input type="email" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + '>';
        } else if (field.type === 'tel') {
            html += '<input type="tel" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + '>';
        } else {
            html += '<input type="text" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + '>';
        }
        
        html += '</div>';
    }
    
    grid.innerHTML = html;
    
    // 폼 제출 이벤트
    form.onsubmit = handleEditSubmit;
    
    // 취소 버튼
    const cancelBtn = document.getElementById('cancelEdit');
    const closeBtn = document.getElementById('closeModal');
    
    if (cancelBtn) cancelBtn.onclick = closeEditModal;
    if (closeBtn) closeBtn.onclick = closeEditModal;
    
    // 모달 표시
    modal.style.display = 'flex';
}

// 수정 처리
export async function handleEditSubmit(e) {
    if (e) e.preventDefault();
    
    const assetData = {};
    
    // 모든 필드 값 수집
    for (let i = 0; i < currentFields.length; i++) {
        const field = currentFields[i];
        const input = document.getElementById('edit_' + field.key);
        
        if (input) {
            assetData[field.key] = input.value;
        }
    }
    
    // 유효성 검사
    const validation = validateAssetData(assetData, currentFields);
    if (!validation.isValid) {
        alert(validation.message);
        return;
    }
    
    // snake_case 변환
    const formattedData = convertKeysToSnakeCase(assetData);
    
    try {
        await updateAsset(currentEditIndex, formattedData);
        alert('✅ 자산이 수정되었습니다!');
        
        closeEditModal();
        
        // 콜백 실행
        if (onFormSubmitCallback) {
            onFormSubmitCallback();
        }
        
    } catch (error) {
        alert('❌ 자산 수정에 실패했습니다: ' + error.message);
    }
}

// 수정 모달 닫기
export function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditIndex = null;
}

console.log('✅ Asset Form Component 로드 완료');