'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useState, useRef, useEffect } from 'react';

export default function ThemeSwitcher() {
    const { themeMode, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const options = [
        { value: 'light', label: '浅色', icon: SunIcon },
        { value: 'dark', label: '深色', icon: MoonIcon },
        { value: 'system', label: '跟随系统', icon: SystemIcon },
    ];

    const currentOption = options.find(o => o.value === themeMode) || options[2];
    const CurrentIcon = currentOption.icon;

    return (
        <div className="theme-switcher" ref={menuRef}>
            <button 
                className="theme-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="切换主题"
            >
                <CurrentIcon />
            </button>

            {isOpen && (
                <div className="theme-menu">
                    {options.map((option) => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                className={`theme-option ${themeMode === option.value ? 'active' : ''}`}
                                onClick={() => {
                                    setTheme(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                <Icon />
                                <span>{option.label}</span>
                                {themeMode === option.value && <CheckIcon />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SunIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

function SystemIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
