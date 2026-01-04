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

// 수정 모달 열기
export function openEditModal(asset, fields) {
    currentFields = fields;
    currentEditIndex = asset.id;
    
    const modal = document.getElementById('editModal');
    if (!modal) return;
    
    // 모달 내용 생성
    let html = '<div style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">';
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">';
    html += '<h3 style="margin: 0; font-size: 20px;">자산 수정</h3>';
    html += '<button onclick="window.assetsFeature.closeEditModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999;">&times;</button>';
    html += '</div>';
    
    html += '<form id="editForm" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">';
    
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const value = asset[field.key] || '';
        const isRequired = field.required ? 'required' : '';
        const requiredMark = field.required ? '<span style="color: red;">*</span>' : '';
        
        html += '<div style="display: flex; flex-direction: column;">';
        html += '<label style="margin-bottom: 5px; font-weight: 600; font-size: 14px;">' + field.name + ' ' + requiredMark + '</label>';
        
        if (field.type === 'date') {
            const dateValue = value ? formatDate(value) : formatDate();
            html += '<input type="date" id="edit_' + field.key + '" value="' + dateValue + '" ' + isRequired + ' style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        } else if (field.type === 'number') {
            html += '<input type="number" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + ' style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        } else if (field.type === 'email') {
            html += '<input type="email" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + ' style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        } else if (field.type === 'tel') {
            html += '<input type="tel" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + ' style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        } else {
            html += '<input type="text" id="edit_' + field.key + '" value="' + value + '" ' + isRequired + ' style="padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">';
        }
        
        html += '</div>';
    }
    
    html += '</form>';
    
    html += '<div style="margin-top: 25px; display: flex; justify-content: flex-end; gap: 10px;">';
    html += '<button onclick="window.assetsFeature.closeEditModal()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">취소</button>';
    html += '<button onclick="window.assetsFeature.handleEditSubmit()" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">수정하기</button>';
    html += '</div>';
    
    html += '</div>';
    
    modal.innerHTML = html;
    modal.style.display = 'flex';
}

// 수정 처리
export async function handleEditSubmit() {
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