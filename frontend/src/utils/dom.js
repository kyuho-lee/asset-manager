// ========== DOM 조작 유틸리티 ==========

export function $(selector) {
    return document.querySelector(selector);
}

export function $$(selector) {
    return document.querySelectorAll(selector);
}

export function createElement(tag, className = '', innerHTML = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
}

export function show(element) {
    if (element) element.style.display = 'block';
}

export function hide(element) {
    if (element) element.style.display = 'none';
}

export function toggle(element) {
    if (!element) return;
    element.style.display = element.style.display === 'none' ? 'block' : 'none';
}

export function addClass(element, className) {
    if (element) element.classList.add(className);
}

export function removeClass(element, className) {
    if (element) element.classList.remove(className);
}

export function toggleClass(element, className) {
    if (element) element.classList.toggle(className);
}

export function hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
}

export function setHTML(element, html) {
    if (element) element.innerHTML = html;
}

export function setText(element, text) {
    if (element) element.textContent = text;
}

export function getValue(element) {
    return element ? element.value : '';
}

export function setValue(element, value) {
    if (element) element.value = value;
}

export function onEvent(element, event, handler) {
    if (element) element.addEventListener(event, handler);
}

export function offEvent(element, event, handler) {
    if (element) element.removeEventListener(event, handler);
}

console.log('✅ DOM 유틸리티 로드 완료');
