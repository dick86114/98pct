'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

export default function FileUpload({ 
    releaseId, 
    onUploadSuccess, 
    accept = '*',
    maxSize = 10 * 1024 * 1024, // 10MB
    compact = false, // 紧凑模式，显示为按钮
    label = '上传文件',
    documentType = 'OTHER', // 文档类型
    documents = [], // 已上传的文件列表
    onDeleteDocument, // 删除文件回调
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
        e.target.value = '';
    };

    const handleFiles = async (files) => {
        for (const file of files) {
            if (file.size > maxSize) {
                toast.error(`文件 ${file.name} 超过大小限制 (${formatSize(maxSize)})`);
                continue;
            }
            await uploadFile(file);
        }
    };

    const uploadFile = async (file) => {
        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('releaseId', releaseId);
        formData.append('type', documentType); // 传递文档类型

        try {
            const token = localStorage.getItem('token');
            
            // 模拟上传进度
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 100);

            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '上传失败');
            }

            const data = await res.json();
            toast.success('文件上传成功');
            onUploadSuccess?.(data.document);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
            }, 500);
        }
    };

    // 紧凑模式 - 显示为按钮
    if (compact) {
        return (
            <div className="upload-compact">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileSelect}
                    multiple
                    hidden
                />
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
                            <span className="loading-spinner-sm"></span>
                            {uploadProgress}%
                        </>
                    ) : (
                        label
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="upload-wrapper">
            <div
                className={`upload-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileSelect}
                    multiple
                    hidden
                />

                {uploading ? (
                    <div className="upload-progress">
                        <div className="progress-ring">
                            <svg viewBox="0 0 100 100">
                                <circle className="progress-bg" cx="50" cy="50" r="45" />
                                <circle 
                                    className="progress-bar" 
                                    cx="50" 
                                    cy="50" 
                                    r="45"
                                    style={{ strokeDashoffset: 283 - (283 * uploadProgress / 100) }}
                                />
                            </svg>
                            <span className="progress-text">{uploadProgress}%</span>
                        </div>
                        <p className="upload-status">正在上传...</p>
                    </div>
                ) : (
                    <>
                        <div className="upload-icon">
                            <UploadIcon />
                        </div>
                        <p className="upload-text">
                            拖拽文件到此处，或 <span className="upload-link">点击上传</span>
                        </p>
                        <p className="upload-hint">
                            支持任意格式，单个文件最大 {formatSize(maxSize)}
                        </p>
                    </>
                )}

                {/* 拖拽时的边框动画 */}
                {isDragging && <div className="drag-border" />}
            </div>
            
            {/* 已上传的文件列表 */}
            {documents && documents.length > 0 && (
                <div className="uploaded-files-list">
                    <h5 className="uploaded-files-title">已上传的文件 ({documents.length})</h5>
                    <div className="uploaded-files">
                        {documents.map(doc => (
                            <div key={doc.id} className="uploaded-file-item">
                                <a href={doc.filepath} target="_blank" className="uploaded-file-link">
                                    <span className="uploaded-file-icon">📄</span>
                                    <div className="uploaded-file-info">
                                        <span className="uploaded-file-name">{doc.filename}</span>
                                        <span className="uploaded-file-meta">
                                            {new Date(doc.createdAt).toLocaleString('zh-CN')}
                                        </span>
                                    </div>
                                </a>
                                {onDeleteDocument && (
                                    <button 
                                        className="uploaded-file-delete"
                                        onClick={(e) => onDeleteDocument(doc.id, doc.filename, e)}
                                        title="删除文件"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function UploadIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}
