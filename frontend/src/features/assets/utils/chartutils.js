// ========== Chart Utilities ==========
// Chart.js 관련 유틸리티 함수들

// 그라디언트 색상 생성
export function createGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

// HSL 색상 생성
export function generateColor(index, total) {
    const hue = (index * 360) / total;
    return 'hsl(' + hue + ', 70%, 60%)';
}

// 차트 데이터 집계
export function aggregateChartData(assets, fieldKey, aggregateType) {
    const dataMap = {};
    
    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const key = asset[fieldKey] || '미지정';
        
        if (!dataMap[key]) {
            dataMap[key] = {
                count: 0,
                sum: 0,
                values: []
            };
        }
        
        dataMap[key].count++;
        
        if (aggregateType === 'sum' || aggregateType === 'avg') {
            const value = parseFloat(asset.price) || 0;
            dataMap[key].sum += value;
            dataMap[key].values.push(value);
        }
    }
    
    const labels = [];
    const data = [];
    
    for (const key in dataMap) {
        if (dataMap.hasOwnProperty(key)) {
            labels.push(key);
            
            if (aggregateType === 'count') {
                data.push(dataMap[key].count);
            } else if (aggregateType === 'sum') {
                data.push(dataMap[key].sum);
            } else if (aggregateType === 'avg') {
                const avg = dataMap[key].sum / dataMap[key].count;
                data.push(Math.round(avg));
            }
        }
    }
    
    return { labels, data };
}

// 차트 색상 배열 생성
export function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(generateColor(i, count));
    }
    return colors;
}

// 차트 옵션 생성
export function createChartOptions(chartType, title, showLegend, showGrid, animate) {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: showLegend,
                position: 'top'
            },
            title: {
                display: !!title,
                text: title,
                font: {
                    size: 16,
                    weight: 'bold'
                }
            }
        }
    };
    
    if (chartType === 'bar' || chartType === 'line') {
        options.scales = {
            y: {
                beginAtZero: true,
                grid: {
                    display: showGrid
                }
            },
            x: {
                grid: {
                    display: showGrid
                }
            }
        };
    }
    
    if (!animate) {
        options.animation = false;
    }
    
    return options;
}

// 차트 데이터셋 생성
export function createChartDataset(chartType, data, labels) {
    const colors = generateColors(data.length);
    
    if (chartType === 'pie' || chartType === 'doughnut') {
        return {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };
    } else if (chartType === 'bar') {
        return {
            labels: labels,
            datasets: [{
                label: '데이터',
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        };
    } else if (chartType === 'line') {
        return {
            labels: labels,
            datasets: [{
                label: '데이터',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#667eea'
            }]
        };
    }
    
    return { labels, datasets: [] };
}

console.log('✅ Chart Utils 로드 완료');