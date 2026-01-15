'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeSwitcher() {
    const { themeMode, setTheme } = useTheme();
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const themes = [
        { value: 'light', label: '浅色', icon: '☀️' },
        { value: 'dark', label: '深色', icon: '🌙' },
        { value: 'system', label: '跟随系统', icon: '💻' },
    ];

    const currentTheme = themes.find(t => t.value === themeMode);

    return (
        <div ref={menuRef} className="theme-switcher">
            <button
                className="theme-btn"
                onClick={() => setShowMenu(!showMenu)}
                title="切换主题"
            >
                <span className="theme-icon">{currentTheme?.icon}</span>
            </button>

            {showMenu && (
                <div className="theme-menu">
                    {themes.map((theme) => (
                        <button
                            key={theme.value}
                            className={`theme-option ${themeMode === theme.value ? 'active' : ''}`}
                            onClick={() => {
                                setTheme(theme.value);
                                setShowMenu(false);
                            }}
                        >
                            <span className="theme-option-icon">{theme.icon}</span>
                            <span className="theme-option-label">{theme.label}</span>
                            {themeMode === theme.value && <span className="theme-check">✓</span>}
                        </button>
                    ))}
                </div>
            )}

            <style jsx>{`
                .theme-switcher {
                    position: relative;
                }

                .theme-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .theme-btn:hover {
                    background: var(--bg-secondary);
                    border-color: var(--primary);
                }

                .theme-icon {
                    font-size: 18px;
                }

                .theme-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 8px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-lg);
                    min-width: 140px;
                    z-index: 1000;
                    overflow: hidden;
                }

                .theme-option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 10px 14px;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    text-align: left;
                }

                .theme-option:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .theme-option.active {
                    background: rgba(99, 102, 241, 0.1);
                    color: var(--primary-light);
                }

                .theme-option-icon {
                    font-size: 16px;
                }

                .theme-option-label {
                    flex: 1;
                }

                .theme-check {
                    color: var(--primary);
                    font-size: 12px;
                }
            `}</style>
        </div>
    );
}
