// 批量更新现有用户的 username 字段
// 使用邮箱前缀作为默认用户名

const fs = require('fs');
const path = require('path');

// 手动加载 .env 文件
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUsernames() {
    try {
        console.log('开始更新用户名...\n');

        // 获取所有没有 username 的用户
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: null },
                    { username: '' }
                ]
            }
        });

        console.log(`找到 ${users.length} 个需要更新的用户\n`);

        for (const user of users) {
            // 使用邮箱前缀作为用户名
            let username = user.email.split('@')[0];
            
            // 检查用户名是否已存在，如果存在则添加数字后缀
            let finalUsername = username;
            let counter = 1;
            while (true) {
                const existing = await prisma.user.findUnique({
                    where: { username: finalUsername }
                });
                if (!existing) break;
                finalUsername = `${username}${counter}`;
                counter++;
            }

            // 更新用户
            await prisma.user.update({
                where: { id: user.id },
                data: { username: finalUsername }
            });

            console.log(`✅ ${user.name} (${user.email}) -> 用户名: ${finalUsername}`);
        }

        console.log('\n更新完成！');

    } catch (error) {
        console.error('更新失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateUsernames();
