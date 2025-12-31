// ========== Dropdown 컴포넌트 ==========

export function createDropdown(id, items = [], options = {}) {
    const {
        trigger = 'click',
        position = 'bottom-right',
        width = '200px'
    } = options;
    
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.id = id;
    
    dropdown.innerHTML = `
        <div class="dropdown-menu" style="width: ${width}; display: none;">
            ${items.map(item => `
                <div class="dropdown-item" onclick="${item.onClick || ''}">
                    ${item.icon ? `<span class="dropdown-icon">${item.icon}</span>` : ''}
                    <span>${item.label}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    return dropdown;
}

export function showDropdown(id, anchorElement) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    
    const menu = dropdown.querySelector('.dropdown-menu');
    if (!menu) return;
    
    // 위치 계산
    const rect = anchorElement.getBoundingClientRect();
    menu.style.display = 'block';
    menu.style.position = 'absolute';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.left = (rect.left) + 'px';
    menu.style.zIndex = '1000';
    
    // 외부 클릭 시 닫기
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && !anchorElement.contains(e.target)) {
                menu.style.display = 'none';
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

export function hideDropdown(id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    
    const menu = dropdown.querySelector('.dropdown-menu');
    if (menu) {
        menu.style.display = 'none';
    }
}

export function toggleDropdown(id, anchorElement) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    
    const menu = dropdown.querySelector('.dropdown-menu');
    if (menu) {
        if (menu.style.display === 'none') {
            showDropdown(id, anchorElement);
        } else {
            hideDropdown(id);
        }
    }
}

// Dropdown CSS
const dropdownStyles = document.createElement('style');
dropdownStyles.textContent = `
    .dropdown {
        position: relative;
    }
    
    .dropdown-menu {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 8px 0;
        min-width: 180px;
    }
    
    .dropdown-item {
        padding: 10px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        transition: background 0.2s;
    }
    
    .dropdown-item:hover {
        background: #f5f5f5;
    }
    
    .dropdown-icon {
        width: 20px;
        text-align: center;
    }
`;
document.head.appendChild(dropdownStyles);

console.log('✅ Dropdown 컴포넌트 로드 완료');
