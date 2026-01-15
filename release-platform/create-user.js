const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestUser() {
    try {
        const hashedPassword = await bcrypt.hash('testpass', 12);
        const user = await prisma.user.upsert({
            where: { email: 'test@example.com' },
            update: { password: hashedPassword },
            create: {
                email: 'test@example.com',
                password: hashedPassword,
                name: 'Test Debug User',
                role: 'PM'
            }
        });
        console.log('Test user created:', user.email);
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUser();
