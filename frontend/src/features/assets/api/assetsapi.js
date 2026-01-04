// ========== Assets API ==========
// 자산 관리 API 호출 함수들

import { apiRequest } from '../../../core/api.js';

// ========== 필드 설정 API ==========

export async function getFieldSettings() {
    try {
        const data = await apiRequest('/settings/registration-fields', {
            method: 'GET'
        });
        
        const fields = data || [];
        const formattedFields = [];
        
        for (let i = 0; i < fields.length; i++) {
            if (fields[i].is_visible) {
                let fieldType = fields[i].field_type;
                
                // 타입 정규화
                if (fieldType !== 'text' && fieldType !== 'number' && fieldType !== 'date' && fieldType !== 'email' && fieldType !== 'tel') {
                    fieldType = 'text';
                }
                
                formattedFields.push({
                    key: fields[i].field_name,
                    name: fields[i].display_name,
                    type: fieldType,
                    required: fields[i].is_required
                });
            }
        }
        
        return formattedFields;
        
    } catch (error) {
        console.error('필드 설정 로드 오류:', error);
        // 기본값 반환
        return [
            { key: 'assetNo', name: '자산번호', required: true, type: 'text' },
            { key: 'model', name: '모델', required: true, type: 'text' },
            { key: 'type', name: '종류', required: true, type: 'text' },
            { key: 'spec', name: '스펙', required: true, type: 'text' },
            { key: 'price', name: '금액', required: true, type: 'number' },
            { key: 'note1', name: '비고1', required: false, type: 'text' },
            { key: 'note2', name: '비고2', required: false, type: 'text' },
            { key: 'note3', name: '비고3', required: false, type: 'text' }
        ];
    }
}

export async function saveFieldSettings(fields) {
    try {
        const formattedFields = fields.map(field => ({
            key: field.key,
            name: field.name,
            type: field.type,
            required: field.required
        }));
        
        await apiRequest('/settings/registration-fields', {
            method: 'PUT',
            body: JSON.stringify({ fields: formattedFields })
        });
        
    } catch (error) {
        console.error('필드 설정 저장 오류:', error);
        throw error;
    }
}

// ========== 컬럼 설정 API ==========

export async function getColumnSettings() {
    try {
        const data = await apiRequest('/settings/columns', {
            method: 'GET'
        });
        
        const columns = data || [];
        const formattedColumns = [{ key: 'no', name: 'NO', width: 60 }];
        
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].is_visible) {
                formattedColumns.push({
                    key: columns[i].field_name,
                    name: columns[i].display_name,
                    width: 120
                });
            }
        }
        
        formattedColumns.push({ key: 'registerDate', name: '등록일', width: 120 });
        formattedColumns.push({ key: 'actions', name: '관리', width: 80 });
        
        return formattedColumns;
        
    } catch (error) {
        console.error('컬럼 설정 로드 오류:', error);
        const fields = await getFieldSettings();
        const columns = [{ key: 'no', name: 'NO', width: 60 }];
        
        for (let i = 0; i < fields.length; i++) {
            columns.push({
                key: fields[i].key,
                name: fields[i].name,
                width: 120
            });
        }
        
        columns.push({ key: 'registerDate', name: '등록일', width: 120 });
        columns.push({ key: 'actions', name: '관리', width: 80 });
        
        return columns;
    }
}

export async function saveColumnSettings(columns) {
    try {
        const formattedColumns = [];
        
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            if (col.key !== 'no' && col.key !== 'registerDate' && col.key !== 'actions') {
                formattedColumns.push({
                    key: col.key,
                    label: col.name,
                    isVisible: true,
                    isRequired: false,
                    order: i
                });
            }
        }
        
        await apiRequest('/settings/columns', {
            method: 'PUT',
            body: JSON.stringify({ columns: formattedColumns })
        });
        
    } catch (error) {
        console.error('컬럼 설정 저장 오류:', error);
    }
}

// ========== 자산 CRUD API ==========

export async function fetchAssets() {
    try {
        const data = await apiRequest('/assets', {
            method: 'GET'
        });
        
        return data.data || [];
    } catch (error) {
        console.error('자산 조회 오류:', error);
        throw error;
    }
}

export async function createAsset(asset) {
    try {
        const data = await apiRequest('/assets', {
            method: 'POST',
            body: JSON.stringify(asset)
        });
        
        return data;
    } catch (error) {
        console.error('자산 등록 오류:', error);
        throw error;
    }
}

export async function updateAsset(id, asset) {
    try {
        const data = await apiRequest('/assets/' + id, {
            method: 'PUT',
            body: JSON.stringify(asset)
        });
        
        return data;
    } catch (error) {
        console.error('자산 수정 오류:', error);
        throw error;
    }
}

export async function deleteAsset(id) {
    try {
        const data = await apiRequest('/assets/' + id, {
            method: 'DELETE'
        });
        
        return data;
    } catch (error) {
        console.error('자산 삭제 오류:', error);
        throw error;
    }
}

console.log('✅ Assets API 로드 완료');