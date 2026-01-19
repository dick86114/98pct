'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import useRoles from '@/hooks/useRoles';
import { useTheme } from '@/contexts/ThemeContext';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const { getRoleLabel } = useRoles();
    const { themeMode, setTheme } = useTheme();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const adminMenuRef = useRef(null);
    const userMenuRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    // 监听滚动
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
                setShowAdminMenu(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isAdmin = (user?.role || '').split(',').includes('ADMIN');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const navLinks = [
        { href: '/dashboard', label: '仪表盘', icon: DashboardIcon },
        { href: '/releases', label: '发版管理', icon: RocketIcon },
    ];

    const adminLinks = isAdmin ? [
        { href: '/users', label: '用户管理', icon: UsersIcon },
        { href: '/admin/releases', label: '发版记录', icon: ListIcon },
        { href: '/admin/dictionary', label: '数据字典', icon: DatabaseIcon },
    ] : [];

    return (
        <>
            <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
                <div className="nav-container">
                    {/* Logo */}
                    <Link href="/dashboard" className="navbar-brand">
                        <div className="brand-logo-wrapper">
                            <div className="brand-logo-glow"></div>
                            <div className="brand-logo-ring"></div>
                            <div className="brand-logo">
                                <img src="/logo.png" alt="九成八" />
                            </div>
                        </div>
                        <div className="brand-text-wrapper">
                            <span className="brand-text">九成八</span>
                            <span className="brand-subtitle">发版管理平台</span>
                        </div>
                    </Link>

                    {/* 桌面端导航 */}
                    <div className="navbar-nav">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                            >
                                <link.icon />
                                <span>{link.label}</span>
                            </Link>
                        ))}
                        
                        {/* 管理员菜单 */}
                        {isAdmin && (
                            <div ref={adminMenuRef} className="dropdown-wrapper">
                                <button
                                    className={`nav-link ${pathname.startsWith('/admin') || pathname === '/users' ? 'active' : ''}`}
                                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                                >
                                    <SettingsIcon />
                                    <span>系统管理</span>
                                    <ChevronIcon className={showAdminMenu ? 'rotate' : ''} />
                                </button>
                                
                                {showAdminMenu && (
                                    <div className="dropdown-menu">
                                        <div className="dropdown-header">系统管理</div>
                                        {adminLinks.map((link) => (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                className={`dropdown-item ${pathname === link.href ? 'active' : ''}`}
                                                onClick={() => setShowAdminMenu(false)}
                                            >
                                                <link.icon />
                                                <span>{link.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 右侧操作区 */}
                    <div className="navbar-actions">
                        {user && (
                            <div ref={userMenuRef} className="dropdown-wrapper">
                                <button 
                                    className="user-menu"
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                >
                                    <div className="user-avatar">
                                        {user.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="user-info">
                                        <span className="user-name">{user.name}</span>
                                        <span className="user-role">{getRoleLabel(user.role)}</span>
                                    </div>
                                    <ChevronIcon className={showUserMenu ? 'rotate' : ''} />
                                </button>
                                
                                {showUserMenu && (
                                    <div className="dropdown-menu user-dropdown">
                                        <div className="dropdown-user-header">
                                            <div className="dropdown-avatar">
                                                {user.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <div className="dropdown-user-name">{user.name}</div>
                                                <div className="dropdown-user-role">{getRoleLabel(user.role)}</div>
                                            </div>
                                        </div>
                                        <div className="dropdown-divider" />
                                        <Link 
                                            href="/profile" 
                                            className="dropdown-item"
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            <UserIcon />
                                            <span>个人资料</span>
                                        </Link>
                                        <div className="dropdown-divider" />
                                        <div className="dropdown-section-title">主题设置</div>
                                        <button 
                                            className={`dropdown-item ${themeMode === 'light' ? 'active' : ''}`}
                                            onClick={() => setTheme('light')}
                                        >
                                            <SunIcon />
                                            <span>浅色</span>
                                            {themeMode === 'light' && <CheckIcon />}
                                        </button>
                                        <button 
                                            className={`dropdown-item ${themeMode === 'dark' ? 'active' : ''}`}
                                            onClick={() => setTheme('dark')}
                                        >
                                            <MoonIcon />
                                            <span>深色</span>
                                            {themeMode === 'dark' && <CheckIcon />}
                                        </button>
                                        <button 
                                            className={`dropdown-item ${themeMode === 'system' ? 'active' : ''}`}
                                            onClick={() => setTheme('system')}
                                        >
                                            <SystemIcon />
                                            <span>跟随系统</span>
                                            {themeMode === 'system' && <CheckIcon />}
                                        </button>
                                        <div className="dropdown-divider" />
                                        <button 
                                            className="dropdown-item danger"
                                            onClick={handleLogout}
                                        >
                                            <LogoutIcon />
                                            <span>退出登录</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 移动端菜单按钮 */}
                        <button 
                            className="mobile-menu-btn"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            aria-label="菜单"
                        >
                            {showMobileMenu ? <CloseIcon /> : <MenuIcon />}
                        </button>
                    </div>
                </div>
                
                {/* 底部发光线 */}
                <div className="nav-glow-line" />
            </nav>

            {/* 移动端侧边菜单 */}
            {showMobileMenu && (
                <div className="mobile-overlay" onClick={() => setShowMobileMenu(false)}>
                    <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
                        {/* 用户信息 */}
                        {user && (
                            <Link 
                                href="/profile"
                                className="mobile-user"
                                onClick={() => setShowMobileMenu(false)}
                            >
                                <div className="mobile-avatar">
                                    {user.name?.charAt(0) || '?'}
                                </div>
                                <div className="mobile-user-info">
                                    <span className="mobile-user-name">{user.name}</span>
                                    <span className="mobile-user-role">{getRoleLabel(user.role)}</span>
                                </div>
                            </Link>
                        )}
                        
                        {/* 导航链接 */}
                        <div className="mobile-nav">
                            {navLinks.map((link, index) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`mobile-link ${pathname === link.href ? 'active' : ''}`}
                                    onClick={() => setShowMobileMenu(false)}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <link.icon />
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                            
                            {isAdmin && (
                                <>
                                    <div className="mobile-divider">系统管理</div>
                                    {adminLinks.map((link, index) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`mobile-link ${pathname === link.href ? 'active' : ''}`}
                                            onClick={() => setShowMobileMenu(false)}
                                            style={{ animationDelay: `${(navLinks.length + index) * 0.05}s` }}
                                        >
                                            <link.icon />
                                            <span>{link.label}</span>
                                        </Link>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* 主题切换 */}
                        <div className="mobile-theme">
                            <span className="mobile-divider">主题设置</span>
                            <ThemeSwitcher />
                        </div>

                        {/* 退出按钮 */}
                        <button className="mobile-logout" onClick={handleLogout}>
                            <LogoutIcon />
                            <span>退出登录</span>
                        </button>
                    </div>
                </div>
            )}

        </>
    );
}

// 图标组件
function DashboardIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

function RocketIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function ListIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    );
}

function DatabaseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}

function MenuIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function ChevronIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="6 9 12 15 18 9" />
        </svg>
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
