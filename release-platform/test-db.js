const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const id = 1; // Change to a valid ID or take as arg
        const release = await prisma.release.findUnique({
            where: { id: id },
            include: {
                createdBy: {
                    select: { id: true, name: true, role: true, email: true },
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true, email: true }
                        },
                        content: {
                            include: {
                                dbChanges: true,
                                configChanges: true
                            }
                        }
                    }
                },
                checklists: {
                    include: {
                        user: {
                            select: { id: true, name: true }
                        },
                        confirmedBy: {
                            select: { id: true, name: true, role: true },
                        },
                    },
                },
                documents: {
                    include: {
                        uploadedBy: {
                            select: { id: true, name: true, role: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        console.log('Release found:', JSON.stringify(release, null, 2));
    } catch (error) {
        console.error('Prisma Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
