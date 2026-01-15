'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 获取数据字典的 Hook
 * @param {string} type - 字典类型：platform, system, status, docType, dbChangeType
 * @returns {Object} { items, loading, getLabel, refresh }
 */
export default function useDictionary(type) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchItems = useCallback(async () => {
        if (!type) {
            setLoading(false);
            return;
        }
        
        try {
            const res = await fetch(`/api/dictionary?type=${type}`);
            const data = await res.json();
            // 只返回启用的选项
            const enabledItems = (data.items || []).filter(item => item.enabled);
            setItems(enabledItems);
        } catch (error) {
            console.error('获取字典数据失败:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // 根据 code 获取显示名称
    const getLabel = useCallback((code) => {
        const item = items.find(i => i.code === code);
        return item?.name || code;
    }, [items]);

    // 刷新数据
    const refresh = useCallback(() => {
        setLoading(true);
        fetchItems();
    }, [fetchItems]);

    return { items, loading, getLabel, refresh };
}
