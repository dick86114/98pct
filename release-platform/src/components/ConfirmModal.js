'use client';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'warning',
    confirmText = '确定',
    cancelText = '取消'
}) {
    if (!isOpen) return null;

    const isDanger = type === 'danger';

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="card" style={{
                width: '400px',
                maxWidth: '90%',
                animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                border: isDanger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-light)'
            }}>
                <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px' }}>
                        <span style={{
                            width: '32px', height: '32px',
                            borderRadius: '50%',
                            background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: isDanger ? 'var(--error)' : 'var(--warning)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            {isDanger ? '⚠️' : '🔔'}
                        </span>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ padding: '8px 0 24px 44px' }}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '14px' }}>
                        {message}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => {
                            onClose();
                            onConfirm();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
