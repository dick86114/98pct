'use client';

import { useState, useEffect } from 'react';

export default function useRoles() {
    const [roles, setRoles] = useState([]);
    const [roleMap, setRoleMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch('/api/roles', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    setRoles(data.roles || []);

                    const map = {};
                    (data.roles || []).forEach(role => {
                        map[role.code] = role.name;
                    });
                    setRoleMap(map);
                }
            } catch (error) {
                console.error('Fetch roles error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
    }, []);

    const getRoleLabel = (code) => {
        if (!code) return '';
        // Handle comma separated roles
        if (code.includes(',')) {
            return code.split(',').map(c => roleMap[c] || c).join(' | ');
        }
        return roleMap[code] || code;
    };

    return { roles, roleMap, getRoleLabel, loading };
}
