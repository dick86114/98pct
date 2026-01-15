'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // 主题模式: 'light' | 'dark' | 'system'
    const [themeMode, setThemeMode] = useState('system');
    // 实际应用的主题: 'light' | 'dark'
    const [resolvedTheme, setResolvedTheme] = useState('dark');

    // 初始化：从 localStorage 读取用户偏好
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme-mode');
        if (savedTheme) {
            setThemeMode(savedTheme);
        }
    }, []);

    // 监听系统主题变化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e) => {
            if (themeMode === 'system') {
                setResolvedTheme(e.matches ? 'dark' : 'light');
            }
        };

        // 初始化解析主题
        if (themeMode === 'system') {
            setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
        } else {
            setResolvedTheme(themeMode);
        }

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themeMode]);

    // 应用主题到 document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', resolvedTheme);
    }, [resolvedTheme]);

    // 切换主题
    const setTheme = (mode) => {
        setThemeMode(mode);
        localStorage.setItem('theme-mode', mode);
    };

    return (
        <ThemeContext.Provider value={{ themeMode, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme 必须在 ThemeProvider 内使用');
    }
    return context;
}
