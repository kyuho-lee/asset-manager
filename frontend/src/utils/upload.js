// ========== 업로드 유틸리티 ==========

import { CLOUDINARY_API_URL, CLOUDINARY_UPLOAD_PRESET, MAX_IMAGE_SIZE } from '../config/constants.js';

export async function uploadToCloudinary(file, type = 'image') {
    if (file.size > MAX_IMAGE_SIZE) {
        throw new Error('파일 크기는 10MB 이하만 가능합니다.');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    const uploadType = type === 'video' ? 'video' : 'image';
    const response = await fetch(`${CLOUDINARY_API_URL}/${uploadType}/upload`, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    
    if (!data.secure_url) {
        throw new Error('업로드 실패');
    }
    
    return data.secure_url;
}

export async function uploadMultipleFiles(files) {
    const uploadPromises = Array.from(files).map(file => {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        return uploadToCloudinary(file, type);
    });
    
    return Promise.all(uploadPromises);
}
