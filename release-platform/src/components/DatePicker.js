'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * 自定义日期选择器组件
 * 使用 Portal 将下拉框渲染到 body，避免被父容器遮挡
 */
export default function DatePicker({
    value,
    onChange,
    placeholder = '选择日期',
    disabled = false,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        if (value && value.trim()) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) return date;
        }
        return new Date();
    });
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 280 });
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    // 计算下拉框位置
    const updateDropdownPosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 280)
            });
        }
    };

    // 打开时计算位置
    useEffect(() => {
        if (isOpen) {
            updateDropdownPosition();
            window.addEventListener('scroll', updateDropdownPosition, true);
            window.addEventListener('resize', updateDropdownPosition);
        }
        return () => {
            window.removeEventListener('scroll', updateDropdownPosition, true);
            window.removeEventListener('resize', updateDropdownPosition);
        };
    }, [isOpen]);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 格式化显示日期
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    };

    // 获取月份的天数
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };

    // 获取月份第一天是星期几
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    // 生成日历数据
    const generateCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const daysInPrevMonth = getDaysInMonth(year, month - 1);

        const days = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isPrev: true });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrentMonth: true, isPrev: false });
        }

        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, isCurrentMonth: false, isPrev: false });
        }

        return days;
    };

    // 选择日期
    const handleSelectDate = (day, isCurrentMonth, isPrev) => {
        let year = viewDate.getFullYear();
        let month = viewDate.getMonth();

        if (!isCurrentMonth) {
            if (isPrev) {
                month--;
                if (month < 0) { month = 11; year--; }
            } else {
                month++;
                if (month > 11) { month = 0; year++; }
            }
        }

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange?.(dateStr);
        setIsOpen(false);
    };

    // 切换月份
    const changeMonth = (delta) => {
        setViewDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    // 判断是否是今天
    const isToday = (day, isCurrentMonth) => {
        if (!isCurrentMonth) return false;
        const today = new Date();
        return viewDate.getFullYear() === today.getFullYear() &&
               viewDate.getMonth() === today.getMonth() &&
               day === today.getDate();
    };

    // 判断是否是选中日期
    const isSelected = (day, isCurrentMonth) => {
        if (!isCurrentMonth || !value) return false;
        const selected = new Date(value);
        return viewDate.getFullYear() === selected.getFullYear() &&
               viewDate.getMonth() === selected.getMonth() &&
               day === selected.getDate();
    };

    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    const calendarDays = generateCalendarDays();

    // 下拉框内容
    const dropdownContent = isOpen && typeof document !== 'undefined' ? createPortal(
        <div
            ref={dropdownRef}
            className="date-picker-dropdown"
            style={{
                position: 'fixed',
                top: dropdownPosition.top - window.scrollY,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 99999
            }}
        >
            <div className="date-picker-header">
                <button type="button" className="date-picker-nav" onClick={() => changeMonth(-1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <span className="date-picker-title">
                    {viewDate.getFullYear()}年{viewDate.getMonth() + 1}月
                </span>
                <button type="button" className="date-picker-nav" onClick={() => changeMonth(1)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>

            <div className="date-picker-weekdays">
                {weekDays.map(day => (
                    <span key={day} className="weekday">{day}</span>
                ))}
            </div>

            <div className="date-picker-days">
                {calendarDays.map((item, idx) => (
                    <button
                        key={idx}
                        type="button"
                        className={`day-cell ${!item.isCurrentMonth ? 'other-month' : ''} ${isToday(item.day, item.isCurrentMonth) ? 'today' : ''} ${isSelected(item.day, item.isCurrentMonth) ? 'selected' : ''}`}
                        onClick={() => handleSelectDate(item.day, item.isCurrentMonth, item.isPrev)}
                    >
                        {item.day}
                    </button>
                ))}
            </div>

            <div className="date-picker-footer">
                <button
                    type="button"
                    className="date-picker-btn clear"
                    onClick={() => { onChange?.(''); setIsOpen(false); }}
                >
                    清除
                </button>
                <button
                    type="button"
                    className="date-picker-btn today"
                    onClick={() => {
                        const today = new Date();
                        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        onChange?.(dateStr);
                        setViewDate(today);
                        setIsOpen(false);
                    }}
                >
                    今天
                </button>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className={`date-picker ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}>
            <div
                ref={triggerRef}
                className="date-picker-trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`date-picker-value ${!value ? 'placeholder' : ''}`}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <span className="date-picker-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </span>
            </div>
            {dropdownContent}
        </div>
    );
}
