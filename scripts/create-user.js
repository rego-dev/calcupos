const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@fcs.com';
    const password = '123700';
    const name = 'Super Admin';
    const roleName = 'super admin';
    const permissions = {
        dashboard: true,
        orders: true,
        batches: true,
        inventory: true,
        customers: true,
        reports: true,
        users: true,
        settings: true,
        adminManage: true,
        stations: true,
        preOrders: true,
        warehouses: true,
    };

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
    });

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            name,
            password: hashedPassword,
            role: roleName,
            roleId: role.id,
            permissions,
        },
        create: {
            email,
            name,
            password: hashedPassword,
            role: roleName,
            roleId: role.id,
            permissions,
        },
    });

    console.log(`Super admin created/found: ${user.email}`);
    console.log(`Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
