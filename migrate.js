const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'calcupos'
    });

    try {
        console.log('Connected to database...');

        // Drop foreign key constraint
        try {
            await connection.query('ALTER TABLE warehouse_products DROP FOREIGN KEY warehouse_products_warehouseId_fkey');
            console.log('✓ Dropped foreign key constraint');
        } catch (err) {
            console.log('Foreign key constraint may not exist, continuing...');
        }

        // Drop index
        try {
            await connection.query('ALTER TABLE warehouse_products DROP INDEX warehouse_products_warehouseId_fkey');
            console.log('✓ Dropped index');
        } catch (err) {
            console.log('Index may not exist, continuing...');
        }

        // Drop warehouseId column
        await connection.query('ALTER TABLE warehouse_products DROP COLUMN warehouseId');
        console.log('✓ Removed warehouseId column from warehouse_products');

        // Drop warehouses table
        await connection.query('DROP TABLE warehouses');
        console.log('✓ Dropped warehouses table');

        // Drop warehouse column from products
        try {
            await connection.query('ALTER TABLE products DROP COLUMN warehouse');
            console.log('✓ Removed warehouse column from products');
        } catch (err) {
            console.log('Warehouse column may not exist in products, continuing...');
        }

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
