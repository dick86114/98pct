'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import useRoles from '@/hooks/useRoles';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const { getRoleLabel } = useRoles();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const adminMenuRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
                setShowAdminMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isPM = (user?.role || '').split(',').includes('PM');
    const isAdmin = (user?.role || '').split(',').includes('ADMIN');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    const navLinks = [
        { href: '/dashboard', label: '仪表盘', icon: '📊' },
        { href: '/releases', label: '发版管理', icon: '🚀' },
    ];

    // 超级管理员菜单
    const adminLinks = isAdmin ? [
        { href: '/users', label: '用户管理', icon: '👥' },
        { href: '/admin/releases', label: '发版记录', icon: '📋' },
        { href: '/admin/dictionary', label: '数据字典', icon: '⚙️' },
    ] : [];
    
    const [showAdminMenu, setShowAdminMenu] = useState(false);

    return (
        <>
            <nav className="navbar">
                <div className="navbar-content">
                    <Link href="/dashboard" className="navbar-brand">
                        <img src="/logo.png" alt="九成八" className="navbar-brand-logo" />
                        <span className="navbar-brand-text">九成八</span>
                    </Link>

                    {/* 移动端菜单按钮 */}
                    <button 
                        className="mobile-menu-btn"
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        aria-label="菜单"
                    >
                        {showMobileMenu ? '✕' : '☰'}
                    </button>

                    {/* 桌面端导航 */}
                    <div className="navbar-nav desktop-nav">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`navbar-link ${pathname === link.href ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{link.icon}</span>
                                <span className="nav-label">{link.label}</span>
                            </Link>
                        ))}
                        
                        {/* 超级管理员菜单 */}
                        {isAdmin && (
                            <div ref={adminMenuRef} className="admin-menu-wrapper">
                                <button
                                    className={`navbar-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
                                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                                >
                                    <span className="nav-icon">⚙️</span>
                                    <span className="nav-label">系统管理</span>
                                    <span className="dropdown-arrow">▼</span>
                                </button>
                                
                                {showAdminMenu && (
                                    <div className="admin-dropdown">
                                        {adminLinks.map((link) => (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                className={`dropdown-item ${pathname === link.href ? 'active' : ''}`}
                                                onClick={() => setShowAdminMenu(false)}
                                                style={{
                                                    display: 'block',
                                                    padding: '10px 16px',
                                                    color: pathname === link.href ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                    background: pathname === link.href ? 'var(--bg-tertiary)' : 'transparent',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    textDecoration: 'none',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <span style={{ marginRight: '8px' }}>{link.icon}</span>
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {user && (
                        <div className="navbar-user desktop-user">
                            <ThemeSwitcher />
                            <Link href="/profile" style={{ textDecoration: 'none' }}>
                                <div style={{ cursor: 'pointer' }}>
                                    <div className="navbar-user-name">{user.name}</div>
                                    <div className="navbar-user-role">
                                        {getRoleLabel(user.role)}
                                    </div>
                                </div>
                            </Link>
                            <button
                                className="btn btn-secondary logout-btn"
                                onClick={handleLogout}
                            >
                                退出
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* 移动端侧边菜单 */}
            {showMobileMenu && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000
                    }}
                    onClick={() => setShowMobileMenu(false)}
                >
                    <div 
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '280px',
                            maxWidth: '85%',
                            height: '100%',
                            background: 'var(--bg-secondary)',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {user && (
                            <Link 
                                href="/profile"
                                onClick={() => setShowMobileMenu(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    paddingBottom: '20px',
                                    borderBottom: '1px solid var(--border-color)',
                                    marginBottom: '16px',
                                    textDecoration: 'none'
                                }}
                            >
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    fontWeight: 600,
                                    color: 'white'
                                }}>
                                    {user.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {user.name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        {getRoleLabel(user.role)} · 点击修改资料
                                    </div>
                                </div>
                            </Link>
                        )}
                        
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setShowMobileMenu(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '14px 12px',
                                        color: pathname === link.href ? 'var(--primary-light)' : 'var(--text-secondary)',
                                        background: pathname === link.href ? 'var(--bg-tertiary)' : 'transparent',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '15px',
                                        textDecoration: 'none',
                                        marginBottom: '4px'
                                    }}
                                >
                                    <span>{link.icon}</span>
                                    {link.label}
                                </Link>
                            ))}
                            
                            {isAdmin && (
                                <>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--text-muted)',
                                        padding: '16px 12px 8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        系统管理
                                    </div>
                                    {adminLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setShowMobileMenu(false)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '14px 12px',
                                                color: pathname === link.href ? 'var(--primary-light)' : 'var(--text-secondary)',
                                                background: pathname === link.href ? 'var(--bg-tertiary)' : 'transparent',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '15px',
                                                textDecoration: 'none',
                                                marginBottom: '4px'
                                            }}
                                        >
                                            <span>{link.icon}</span>
                                            {link.label}
                                        </Link>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* 移动端主题切换 */}
                        <div style={{
                            padding: '16px 0',
                            borderTop: '1px solid var(--border-color)',
                            marginTop: '16px'
                        }}>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-muted)',
                                marginBottom: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                主题设置
                            </div>
                            <ThemeSwitcher />
                        </div>

                        <button
                            onClick={() => {
                                setShowMobileMenu(false);
                                handleLogout();
                            }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-secondary)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                marginTop: '16px'
                            }}
                        >
                            退出登录
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* 移动端菜单按钮 */
                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: var(--text-primary);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: var(--radius-sm);
                    transition: background 0.2s ease;
                }

                .mobile-menu-btn:hover {
                    background: var(--bg-tertiary);
                }

                /* 导航链接样式 */
                .nav-icon {
                    margin-right: 6px;
                }

                .admin-menu-wrapper {
                    position: relative;
                }

                .admin-menu-wrapper .navbar-link {
                    background: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }

                .dropdown-arrow {
                    margin-left: 4px;
                    font-size: 10px;
                }

                .admin-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    min-width: 140px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 1000;
                    margin-top: 4px;
                    display: flex;
                    flex-direction: column;
                }

                .admin-dropdown a:last-child {
                    border-bottom: none !important;
                }

                .admin-dropdown a:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .logout-btn {
                    padding: 6px 12px;
                    font-size: 12px;
                }

                /* 移动端菜单遮罩 */
                .mobile-menu-overlay {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                /* 移动端菜单 */
                .mobile-menu {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 280px;
                    max-width: 85%;
                    height: 100%;
                    background: var(--bg-secondary);
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    animation: slideIn 0.2s ease;
                }

                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }

                .mobile-user-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 16px;
                }

                .mobile-user-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 600;
                    color: white;
                }

                .mobile-user-name {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .mobile-user-role {
                    font-size: 13px;
                    color: var(--text-muted);
                }

                .mobile-nav-links {
                    flex: 1;
                    overflow-y: auto;
                }

                .mobile-nav-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 12px;
                    color: var(--text-secondary);
                    border-radius: var(--radius-sm);
                    font-size: 15px;
                    transition: all 0.2s ease;
                }

                .mobile-nav-link:hover,
                .mobile-nav-link.active {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .mobile-nav-link.active {
                    color: var(--primary-light);
                }

                .mobile-nav-divider {
                    font-size: 12px;
                    color: var(--text-muted);
                    padding: 16px 12px 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .mobile-logout-btn {
                    width: 100%;
                    padding: 14px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-top: 16px;
                }

                .mobile-logout-btn:hover {
                    background: var(--error);
                    border-color: var(--error);
                    color: white;
                }

                /* 响应式 */
                @media (max-width: 768px) {
                    .mobile-menu-btn {
                        display: block;
                    }

                    .mobile-menu-overlay {
                        display: block;
                    }

                    .desktop-nav {
                        display: none;
                    }

                    .desktop-user {
                        display: none;
                    }

                    .navbar-brand-text {
                        display: none;
                    }
                }

                @media (max-width: 1024px) and (min-width: 769px) {
                    .nav-label {
                        display: none;
                    }

                    .nav-icon {
                        margin-right: 0;
                    }

                    .dropdown-arrow {
                        display: none;
                    }

                    .navbar-user-role {
                        display: none;
                    }
                }
            `}</style>
        </>
    );
}
