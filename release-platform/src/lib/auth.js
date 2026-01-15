import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'release-platform-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// 密码加密
export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

// 密码校验
export async function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

// 生成 JWT Token
export function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// 验证 JWT Token
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// 从请求头获取用户信息
export function getUserFromRequest(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    return verifyToken(token);
}

// 检查是否有该角色
export function hasRole(userRoleString, targetRole) {
    if (!userRoleString) return false;
    const roles = userRoleString.split(',');
    return roles.includes(targetRole);
}

// 检查是否有权限操作检查清单
export function canConfirmChecklist(userRoleString, allowedRoles) {
    if (!userRoleString) return false;
    const userRoles = userRoleString.split(',');
    // 只要用户拥有的任一角色在 allowedRoles 里即可
    return allowedRoles.some(allowed => userRoles.includes(allowed));
}
