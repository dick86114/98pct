'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * 自定义下拉选择组件
 * @param {Object} props
 * @param {Array} props.options - 选项数组 [{value, label}] 或 字符串数组
 * @param {string} props.value - 当前选中值
 * @param {Function} props.onChange - 值变化回调
 * @param {string} props.placeholder - 占位文本
 * @param {string} props.className - 额外的类名
 * @param {boolean} props.disabled - 是否禁用
 */
export default function CustomSelect({ 
    options = [], 
    value, 
    onChange, 
    placeholder = '请选择',
    className = '',
    disabled = false 
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // 标准化选项格式
    const normalizedOptions = options.map(opt => 
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    // 获取当前选中项的标签
    const selectedOption = normalizedOptions.find(opt => opt.value === value);
    const displayText = selectedOption?.label || placeholder;

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 键盘导航
    const handleKeyDown = (e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (optValue) => {
        onChange?.(optValue);
        setIsOpen(false);
    };

    return (
        <div 
            ref={containerRef} 
            className={`custom-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKeyDown}
        >
            <div 
                className="custom-select-trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`custom-select-value ${!selectedOption ? 'placeholder' : ''}`}>
                    {displayText}
                </span>
                <span className="custom-select-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </div>
            
            {isOpen && (
                <div className="custom-select-dropdown">
                    {normalizedOptions.length === 0 ? (
                        <div className="custom-select-empty">暂无选项</div>
                    ) : (
                        normalizedOptions.map((opt, idx) => (
                            <div
                                key={opt.value || idx}
                                className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                {opt.label}
                                {opt.value === value && (
                                    <span className="custom-select-check">✓</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
