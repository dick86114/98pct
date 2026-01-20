// 通用工具函数库

/**
 * 格式化日期为本地化字符串
 * @param {string|Date} dateStr - 日期字符串或 Date 对象
 * @param {object} options - Intl.DateTimeFormat 选项
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(dateStr, options = { month: 'long', day: 'numeric' }) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', options);
}

/**
 * 格式化相对时间（今天、昨天、X天前等）
 * @param {string|Date} dateStr - 日期字符串或 Date 对象
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 根据文件名获取对应的图标 emoji
 * @param {string} filename - 文件名
 * @returns {string} 图标 emoji
 */
export function getFileIcon(filename) {
    if (!filename) return '📄';
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap = {
        // 图片
        'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️', 'ico': '🖼️', 'bmp': '🖼️',
        // 文档
        'pdf': '📕', 'doc': '📘', 'docx': '📘', 'txt': '📝', 'md': '📝',
        // 表格
        'xls': '📊', 'xlsx': '📊', 'csv': '📊',
        // 演示
        'ppt': '📙', 'pptx': '📙',
        // 压缩包
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
        // 代码
        'js': '💻', 'ts': '💻', 'jsx': '💻', 'tsx': '💻', 'py': '💻', 'java': '💻', 'sql': '🗄️', 'json': '📋', 'xml': '📋', 'html': '🌐', 'css': '🎨',
        // 其他
        'log': '📜', 'sh': '⚙️', 'bat': '⚙️',
    };
    return iconMap[ext] || '📄';
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 获取问候语
 * @returns {string} 问候语
 */
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜深了';
}

/**
 * 检查用户是否有指定权限
 * @param {string} userRoleString - 用户角色字符串（逗号分隔）
 * @param {Array<string>} allowedRoles - 允许的角色列表
 * @returns {boolean} 是否有权限
 */
export function hasPermission(userRoleString, allowedRoles) {
    if (!userRoleString) return false;
    const userRoles = userRoleString.split(',');
    return userRoles.includes('ADMIN') || userRoles.includes('PM') || allowedRoles.some(r => userRoles.includes(r));
}

/**
 * 深度比较两个对象是否相等
 * @param {any} obj1 - 对象1
 * @param {any} obj2 - 对象2
 * @returns {boolean} 是否相等
 */
export function deepEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
}

/**
 * 安全地从 localStorage 获取 JSON 数据
 * @param {string} key - 键名
 * @param {any} defaultValue - 默认值
 * @returns {any} 解析后的数据或默认值
 */
export function getLocalStorage(key, defaultValue = null) {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * 安全地向 localStorage 设置 JSON 数据
 * @param {string} key - 键名
 * @param {any} value - 要存储的值
 * @returns {boolean} 是否成功
 */
export function setLocalStorage(key, value) {
    if (typeof window === 'undefined') return false;
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        return false;
    }
}

/**
 * 生成唯一 ID
 * @returns {string} 唯一 ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 截断文本
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀（默认为 '...'）
 * @returns {string} 截断后的文本
 */
export function truncateText(text, maxLength, suffix = '...') {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + suffix;
}

/**
 * 延迟执行
 * @param {number} ms - 延迟时间（毫秒）
 * @returns {Promise} Promise 对象
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 批量处理数组（分批执行）
 * @param {Array} array - 要处理的数组
 * @param {number} batchSize - 每批大小
 * @param {Function} processor - 处理函数
 * @returns {Promise<Array>} 处理结果数组
 */
export async function processBatch(array, batchSize, processor) {
    const results = [];
    for (let i = 0; i < array.length; i += batchSize) {
        const batch = array.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
    }
    return results;
}
