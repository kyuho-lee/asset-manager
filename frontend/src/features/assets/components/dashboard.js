// ========== Dashboard Component ==========
// 자산 통계 및 차트 대시보드

import { fetchAssets } from '../api/assetsapi.js';
import { formatNumber } from '../utils/assetutils.js';
import { aggregateChartData, createChartOptions, createChartDataset } from '../utils/chartUtils.js';

let currentChart = null;
let dashboardAssets = [];

// 대시보드 로드
export async function loadDashboard() {
    try {
        dashboardAssets = await fetchAssets();
        renderStatistics();
        renderDefaultChart();
    } catch (error) {
        console.error('대시보드 로드 오류:', error);
        alert('대시보드를 불러오는데 실패했습니다.');
    }
}

// 통계 렌더링
function renderStatistics() {
    // 통계 계산
    const totalAssets = dashboardAssets.length;
    let totalValue = 0;
    
    for (let i = 0; i < dashboardAssets.length; i++) {
        const price = parseFloat(dashboardAssets[i].price) || 0;
        totalValue += price;
    }
    
    const avgPrice = totalAssets > 0 ? Math.round(totalValue / totalAssets) : 0;
    
    // HTML에 이미 통계 카드가 있으므로 값만 업데이트
    const totalAssetsEl = document.getElementById('totalAssets');
    const totalValueEl = document.getElementById('totalValue');
    const avgPriceEl = document.getElementById('avgPrice');
    
    if (totalAssetsEl) totalAssetsEl.textContent = formatNumber(totalAssets);
    if (totalValueEl) totalValueEl.textContent = formatNumber(totalValue) + '원';
    if (avgPriceEl) avgPriceEl.textContent = formatNumber(avgPrice) + '원';
}

// 기본 차트 렌더링 (첫 번째 필드 기준)
function renderDefaultChart() {
    // analyzeField에서 선택된 값 확인, 없으면 type 사용
    const analyzeField = document.getElementById('analyzeField');
    const firstFieldKey = analyzeField && analyzeField.options.length > 1 
        ? analyzeField.options[1].value  // 첫 번째 실제 필드
        : 'type';
    
    generateChart(firstFieldKey, 'count', 'bar');
}

// 차트 생성
export function generateChart(fieldKey, aggregateType, chartType) {
    if (dashboardAssets.length === 0) {
        alert('데이터가 없습니다.');
        return;
    }
    
    // 데이터 집계
    const { labels, data } = aggregateChartData(dashboardAssets, fieldKey, aggregateType);
    
    if (labels.length === 0) {
        alert('차트 데이터가 없습니다.');
        return;
    }
    
    // 차트 제목
    const aggregateLabels = { 'count': '개수', 'sum': '합계', 'avg': '평균' };
    const title = fieldKey + '별 ' + (aggregateLabels[aggregateType] || '데이터');
    
    // 차트 옵션
    const options = createChartOptions(chartType, title, true, true, true);
    
    // 데이터셋
    const chartData = createChartDataset(chartType, data, labels);
    
    // 기존 차트 삭제
    if (currentChart) {
        currentChart.destroy();
    }
    
    // 차트 생성 (mainChart canvas 사용)
    const ctx = document.getElementById('mainChart');
    if (ctx) {
        currentChart = new Chart(ctx, {
            type: chartType,
            data: chartData,
            options: options
        });
    }
}

// 차트 컨트롤 필드 초기화 (HTML에 이미 UI 존재)
export function renderChartControls(fields) {
    const analyzeField = document.getElementById('analyzeField');
    if (!analyzeField) return;
    
    // 분석 항목 옵션 추가
    let html = '<option value="">항목 선택</option>';
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        html += '<option value="' + field.key + '">' + field.name + '</option>';
    }
    
    analyzeField.innerHTML = html;
    
    // 차트 생성 버튼 이벤트 (onclick이 HTML에 있으면 불필요)
    const generateBtn = document.getElementById('generateChartBtn');
    if (generateBtn) {
        generateBtn.onclick = updateChart;
    }
}

// 차트 업데이트
export function updateChart() {
    const fieldKey = document.getElementById('analyzeField').value;
    const aggregateType = document.getElementById('aggregateType').value;
    const chartType = document.getElementById('chartType').value;
    
    if (!fieldKey) {
        alert('분석 항목을 선택해주세요!');
        return;
    }
    
    generateChart(fieldKey, aggregateType, chartType);
}

console.log('✅ Dashboard Component 로드 완료');