import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

export const metadata = {
    title: '今天发什么 | 发版管理平台',
    description: '企业级软件发版流程管理系统，支持多角色协作、三阶段流程控制、检查清单确认',
    icons: {
        icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/logo.png', type: 'image/png' },
        ],
        apple: '/logo.png',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
                {/* 防止主题闪烁的内联脚本 */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    var mode = localStorage.getItem('theme-mode') || 'system';
                                    var theme = mode;
                                    if (mode === 'system') {
                                        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                                    }
                                    document.documentElement.setAttribute('data-theme', theme);
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body>
                <ThemeProvider>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#333',
                                color: '#fff',
                            },
                        }}
                    />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
