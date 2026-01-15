'use client';

import { useState, useRef, useEffect } from 'react';
import useDictionary from '@/hooks/useDictionary';

export default function FileUpload({ releaseId, documents, onUploadSuccess }) {
    const [uploading, setUploading] = useState(false);
    const [docType, setDocType] = useState('');
    const fileInputRef = useRef(null);
    
    // 从字典获取文档类型
    const { items: documentTypes, loading: typesLoading } = useDictionary('docType');
    
    // 设置默认选中第一个类型
    useEffect(() => {
        if (documentTypes.length > 0 && !docType) {
            setDocType(documentTypes[0].code);
        }
    }, [documentTypes, docType]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 确保有选中的文档类型
        const uploadType = docType || (documentTypes.length > 0 ? documentTypes[0].code : 'OTHER');

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('releaseId', releaseId);
        formData.append('type', uploadType);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '上传失败');
            }

            onUploadSuccess?.(data.document);
            fileInputRef.current.value = '';
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    };
    
    // 获取类型标签
    const getTypeLabel = (typeCode) => {
        const found = documentTypes.find(t => t.code === typeCode);
        return found ? found.name : typeCode;
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">📎 文档附件</h3>
                <span className="badge badge-info">{documents?.length || 0} 个文件</span>
            </div>

            {/* 上传区域 */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <select
                        className="form-select"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        style={{ flex: 1 }}
                        disabled={typesLoading}
                    >
                        {documentTypes.map((type) => (
                            <option key={type.code} value={type.code}>
                                {type.name}
                            </option>
                        ))}
                    </select>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || typesLoading}
                    >
                        {uploading ? '上传中...' : '选择文件'}
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    支持上传测试报告、验收报告、备份截图等文档
                </p>
            </div>

            {/* 文件列表 */}
            <div className="file-list">
                {documents?.length > 0 ? (
                    documents.map((doc) => (
                        <div key={doc.id} className="file-item">
                            <div>
                                <div className="file-item-name">
                                    <a
                                        href={doc.filepath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--primary-light)' }}
                                    >
                                        📄 {doc.filename}
                                    </a>
                                </div>
                                <div className="file-item-meta">
                                    {getTypeLabel(doc.type)} |
                                    上传者: {doc.uploadedBy?.name} |
                                    {new Date(doc.createdAt).toLocaleString('zh-CN')}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state" style={{ padding: '30px 20px' }}>
                        <div className="empty-state-icon">📁</div>
                        <p className="text-muted">暂无文档</p>
                    </div>
                )}
            </div>
        </div>
    );
}
