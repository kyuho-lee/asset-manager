// ========== Excel Upload Component ==========
// 엑셀 업로드/다운로드 기능

import { fetchAssets, createAsset, updateAsset } from '../api/assetsapi.js';
import { formatDate } from '../utils/assetutils.js';

let onExcelUploadCallback = null;

// 엑셀 업로드 초기화
export function initExcelUpload(onUploadCallback) {
    onExcelUploadCallback = onUploadCallback;
}

// 엑셀 다운로드
export async function downloadExcel(fields) {
    try {
        const assets = await fetchAssets();
        
        if (assets.length === 0) {
            alert('다운로드할 자산이 없습니다.');
            return;
        }
        
        // 워크시트 데이터 생성
        const headers = ['NO'];
        for (let i = 0; i < fields.length; i++) {
            headers.push(fields[i].name);
        }
        headers.push('등록일');
        
        const data = [headers];
        
        for (let i = 0; i < assets.length; i++) {
            const asset = assets[i];
            const row = [i + 1];
            
            for (let j = 0; j < fields.length; j++) {
                const field = fields[j];
                row.push(asset[field.key] || '');
            }
            
            row.push(formatDate(asset.register_date || asset.created_at));
            data.push(row);
        }
        
        // XLSX 생성
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '자산목록');
        
        // 다운로드
        const today = formatDate();
        XLSX.writeFile(wb, '자산목록_' + today + '.xlsx');
        
    } catch (error) {
        console.error('엑셀 다운로드 오류:', error);
        alert('엑셀 다운로드에 실패했습니다.');
    }
}

// 엑셀 템플릿 다운로드
export function downloadExcelTemplate(fields) {
    // 템플릿 데이터 생성
    const headers = [];
    for (let i = 0; i < fields.length; i++) {
        headers.push(fields[i].name);
    }
    
    const exampleRow = [];
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (field.key === 'assetNo') {
            exampleRow.push('A001');
        } else if (field.key === 'model') {
            exampleRow.push('갤럭시북');
        } else if (field.key === 'type') {
            exampleRow.push('노트북');
        } else if (field.key === 'spec') {
            exampleRow.push('15.6인치, i5');
        } else if (field.key === 'price') {
            exampleRow.push(1200000);
        } else if (field.type === 'date') {
            exampleRow.push(formatDate());
        } else {
            exampleRow.push('예시 데이터');
        }
    }
    
    const data = [headers, exampleRow];
    
    // XLSX 생성
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '자산등록템플릿');
    
    // 다운로드
    XLSX.writeFile(wb, '자산등록_템플릿.xlsx');
}

// 엑셀 업로드 모달 열기 (HTML에 이미 존재하는 모달 사용)
export function showExcelUploadModal() {
    const modal = document.getElementById('excelUploadModal');
    if (!modal) return;
    
    // 초기화
    const fileInput = document.getElementById('excelFileInput');
    const preview = document.getElementById('excelPreview');
    const uploadBtn = document.getElementById('uploadExcelBtn');
    
    if (fileInput) {
        fileInput.value = '';
        // 파일 선택 이벤트 연결
        fileInput.onchange = previewExcel;
    }
    
    if (preview) {
        preview.style.display = 'none';
    }
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
    }
    
    modal.style.display = 'flex';
}

// 엑셀 미리보기
function previewExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            const preview = document.getElementById('excelPreview');
            const previewContent = document.getElementById('excelPreviewContent');
            const statsDiv = document.getElementById('excelStats');
            const uploadBtn = document.getElementById('uploadExcelBtn');
            
            if (preview && jsonData.length > 0) {
                let html = '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
                
                for (let i = 0; i < Math.min(jsonData.length, 6); i++) {
                    const row = jsonData[i];
                    html += '<tr style="border-bottom: 1px solid #ddd;">';
                    
                    for (let j = 0; j < row.length; j++) {
                        const isHeader = i === 0;
                        const style = isHeader ? 'padding: 8px; font-weight: 600; background: #e9ecef;' : 'padding: 8px;';
                        html += '<td style="' + style + '">' + (row[j] || '') + '</td>';
                    }
                    
                    html += '</tr>';
                }
                
                html += '</table>';
                
                if (previewContent) {
                    previewContent.innerHTML = html;
                }
                
                if (statsDiv) {
                    statsDiv.innerHTML = '<p style="margin: 0; color: #0066cc; font-weight: 600;">📊 총 ' + (jsonData.length - 1) + '개 행 (헤더 제외)</p>';
                }
                
                preview.style.display = 'block';
                
                if (uploadBtn) {
                    uploadBtn.disabled = false;
                }
            }
            
        } catch (error) {
            console.error('엑셀 미리보기 오류:', error);
            alert('엑셀 파일을 읽을 수 없습니다.');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// 엑셀 업로드 처리
export async function processExcelUpload(fields) {
    const fileInput = document.getElementById('excelFileInput');
    if (!fileInput || !fileInput.files[0]) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                alert('데이터가 없습니다.');
                return;
            }
            
            // 기존 자산 로드
            const existingAssets = await fetchAssets();
            const existingAssetNos = existingAssets.map(a => a.asset_no);
            
            let newCount = 0;
            let updateCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];
                
                // 필드 매핑
                const assetData = {};
                for (let j = 0; j < fields.length; j++) {
                    const field = fields[j];
                    const value = row[field.name];
                    
                    if (value !== undefined && value !== null && value !== '') {
                        assetData[field.key] = value;
                    }
                }
                
                try {
                    // snake_case 변환
                    const formattedData = {};
                    for (const key in assetData) {
                        const snakeKey = key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
                        formattedData[snakeKey] = assetData[key];
                    }
                    
                    // 신규 or 수정 판단
                    if (existingAssetNos.includes(formattedData.asset_no)) {
                        // 수정
                        const existingAsset = existingAssets.find(a => a.asset_no === formattedData.asset_no);
                        await updateAsset(existingAsset.id, formattedData);
                        updateCount++;
                    } else {
                        // 신규
                        await createAsset(formattedData);
                        newCount++;
                    }
                    
                } catch (error) {
                    console.error('행 처리 오류:', row, error);
                    errorCount++;
                }
            }
            
            alert('✅ 엑셀 업로드 완료!\n신규: ' + newCount + '개\n수정: ' + updateCount + '개\n오류: ' + errorCount + '개');
            
            closeExcelUploadModal();
            
            // 콜백 실행
            if (onExcelUploadCallback) {
                onExcelUploadCallback();
            }
            
        } catch (error) {
            console.error('엑셀 업로드 오류:', error);
            alert('❌ 엑셀 업로드에 실패했습니다: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// 엑셀 업로드 모달 닫기
export function closeExcelUploadModal() {
    const modal = document.getElementById('excelUploadModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

console.log('✅ Excel Upload Component 로드 완료');