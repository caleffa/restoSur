const { query } = require('../repositories/baseRepository');

async function columnExists(tableName, columnName) {
  const rows = await query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return Boolean(rows[0]);
}

async function foreignKeyExists(tableName, columnName) {
  const rows = await query(
    `SELECT 1
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL
     LIMIT 1`,
    [tableName, columnName]
  );
  return Boolean(rows[0]);
}

async function ensureColumn(tableName, columnName, definition, afterColumn = null) {
  if (await columnExists(tableName, columnName)) return;

  const afterClause = afterColumn ? ` AFTER ${afterColumn}` : '';
  await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}${afterClause}`);
}

async function getColumnType(tableName, columnName) {
  const rows = await query(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows[0]?.COLUMN_TYPE || null;
}

async function ensureCashSchema() {
  await ensureAfipSchema();
  await ensureAreasSchema();
  await ensureArticlesSchema();
  await ensureStockSchema();
  await ensureCommerceSchema();
  await ensureColumn(
    'tables_restaurant',
    'table_type',
    "ENUM('REDONDA','CUADRADA','RECTANGULAR_HORIZONTAL','RECTANGULAR_VERTICAL') NOT NULL DEFAULT 'CUADRADA'",
    'table_number'
  );
  await ensureColumn('tables_restaurant', 'capacity', 'INT NOT NULL DEFAULT 4', 'table_number');
  await ensureColumn('kitchen_orders', 'sale_item_id', 'INT NULL', 'sale_id');
  await ensureColumn('kitchen_orders', 'quantity', 'DECIMAL(12,3) NOT NULL DEFAULT 1', 'branch_id');
  await ensureColumn('kitchen_orders', 'kitchen_id', 'INT NULL', 'quantity');
  await ensureColumn('kitchen_orders', 'user_id', 'INT NULL', 'kitchen_id');

  await query(
    `UPDATE kitchen_orders ko
     JOIN sale_items si ON si.sale_id = ko.sale_id
     SET ko.sale_item_id = si.id, ko.quantity = si.quantity
     WHERE ko.sale_item_id IS NULL`
  ).catch(() => {});

  await query(
    `UPDATE kitchen_orders ko
     JOIN sale_items si ON si.id = ko.sale_item_id
     JOIN recipes r ON r.product_id = si.article_id
     SET ko.kitchen_id = r.kitchen_id
     WHERE ko.kitchen_id IS NULL`
  ).catch(() => {});

  await query('ALTER TABLE kitchen_orders MODIFY sale_item_id INT NOT NULL').catch(() => {});

  if (!(await foreignKeyExists('kitchen_orders', 'sale_item_id'))) {
    await query(
      `ALTER TABLE kitchen_orders
       ADD CONSTRAINT fk_kitchen_orders_sale_item
       FOREIGN KEY (sale_item_id) REFERENCES sale_items(id)`
    ).catch(() => {});
  }

  if (!(await foreignKeyExists('kitchen_orders', 'kitchen_id'))) {
    await query(
      `ALTER TABLE kitchen_orders
       ADD CONSTRAINT fk_kitchen_orders_kitchen
       FOREIGN KEY (kitchen_id) REFERENCES kitchens(id)`
    ).catch(() => {});
  }

  if (!(await foreignKeyExists('kitchen_orders', 'user_id'))) {
    await query(
      `ALTER TABLE kitchen_orders
       ADD CONSTRAINT fk_kitchen_orders_user
       FOREIGN KEY (user_id) REFERENCES users(id)`
    ).catch(() => {});
  }

  await query(
    `CREATE TABLE IF NOT EXISTS cash_registers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_register_branch_name (branch_id, name),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS cash_shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      register_id INT NOT NULL,
      branch_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('ABIERTA','CERRADA') DEFAULT 'ABIERTA',
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP NULL,
      opening_balance DECIMAL(12,2) NOT NULL,
      expected_balance DECIMAL(12,2) NULL,
      real_balance DECIMAL(12,2) NULL,
      difference DECIMAL(12,2) NULL,
      opening_note VARCHAR(255) NULL,
      closing_note VARCHAR(255) NULL,
      FOREIGN KEY (register_id) REFERENCES cash_registers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS cash_movement_reasons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      type ENUM('INGRESO','EGRESO') NOT NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cash_reason_description_type (description, type)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS cash_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shift_id INT NOT NULL,
      register_id INT NOT NULL,
      branch_id INT NOT NULL,
      user_id INT NOT NULL,
      sale_id INT NULL,
      type ENUM('APERTURA','VENTA','INGRESO','EGRESO','CIERRE') NOT NULL,
      payment_method VARCHAR(30) NULL,
      reference VARCHAR(60) NULL,
      amount DECIMAL(12,2) NOT NULL,
      reason VARCHAR(255) NULL,
      reason_id INT NULL,
      observation VARCHAR(255) NULL,
      affects_balance TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES cash_shifts(id),
      FOREIGN KEY (register_id) REFERENCES cash_registers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reason_id) REFERENCES cash_movement_reasons(id)
    )`
  );

  await ensureColumn('cash_movements', 'shift_id', 'INT NULL', 'id');
  await ensureColumn('cash_movements', 'register_id', 'INT NULL', 'shift_id');
  await ensureColumn('cash_movements', 'branch_id', 'INT NULL', 'register_id');
  await ensureColumn('cash_movements', 'payment_method', 'VARCHAR(30) NULL', 'type');
  await ensureColumn('cash_movements', 'reference', 'VARCHAR(60) NULL', 'payment_method');
  await ensureColumn('cash_movements', 'reason', 'VARCHAR(255) NULL', 'amount');
  await ensureColumn('cash_movements', 'reason_id', 'INT NULL', 'reason');
  await ensureColumn('cash_movements', 'observation', 'VARCHAR(255) NULL', 'reason');
  await ensureColumn('cash_movements', 'affects_balance', 'TINYINT(1) DEFAULT 1', 'observation');

  if (!(await foreignKeyExists('cash_movements', 'shift_id'))) {
    await query(
      `ALTER TABLE cash_movements
       ADD CONSTRAINT fk_cash_movements_shift
       FOREIGN KEY (shift_id) REFERENCES cash_shifts(id)`
    );
  }

  if (!(await foreignKeyExists('cash_movements', 'register_id'))) {
    await query(
      `ALTER TABLE cash_movements
       ADD CONSTRAINT fk_cash_movements_register
       FOREIGN KEY (register_id) REFERENCES cash_registers(id)`
    );
  }

  if (!(await foreignKeyExists('cash_movements', 'branch_id'))) {
    await query(
      `ALTER TABLE cash_movements
       ADD CONSTRAINT fk_cash_movements_branch
       FOREIGN KEY (branch_id) REFERENCES branches(id)`
    );
  }

  if (!(await foreignKeyExists('cash_movements', 'reason_id'))) {
    await query(
      `ALTER TABLE cash_movements
       ADD CONSTRAINT fk_cash_movements_reason
       FOREIGN KEY (reason_id) REFERENCES cash_movement_reasons(id)`
    ).catch(() => {});
  }
}

async function ensureStockSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS stock (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      article_id INT NOT NULL,
      quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_stock_branch_article (branch_id, article_id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (article_id) REFERENCES articles(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      article_id INT NOT NULL,
      user_id INT NOT NULL,
      type ENUM('INGRESO','EGRESO','AJUSTE') NOT NULL,
      quantity DECIMAL(12,3) NOT NULL,
      reason VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (article_id) REFERENCES articles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  );
}



async function ensureArticlesSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS kitchen_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await ensureColumn('kitchen_types', 'active', 'TINYINT(1) DEFAULT 1', 'description');

  await query(
    `CREATE TABLE IF NOT EXISTS kitchens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      kitchen_type_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255) NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_kitchen_branch_name (branch_id, name),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (kitchen_type_id) REFERENCES kitchen_types(id)
    )`
  );

  await ensureColumn('kitchens', 'description', 'VARCHAR(255) NULL', 'name');
  await ensureColumn('kitchens', 'active', 'TINYINT(1) DEFAULT 1', 'description');

  await query(
    `CREATE TABLE IF NOT EXISTS article_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS measurement_units (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      allows_fraction TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await ensureColumn('measurement_units', 'allows_fraction', 'TINYINT(1) NOT NULL DEFAULT 1', 'description');

  await query(
    `CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      sku VARCHAR(80) NOT NULL UNIQUE,
      barcode VARCHAR(120) NULL UNIQUE,
      article_type_id INT NOT NULL,
      measurement_unit_id INT NOT NULL,
      category_id INT NULL,
      cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      manages_stock TINYINT(1) DEFAULT 1,
      is_product TINYINT(1) DEFAULT 0,
      is_supply TINYINT(1) DEFAULT 1,
      for_sale TINYINT(1) DEFAULT 0,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (article_type_id) REFERENCES article_types(id),
      FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`
  );

  await ensureColumn('articles', 'category_id', 'INT NULL', 'measurement_unit_id');
  await ensureColumn('articles', 'sale_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0', 'cost');
  await ensureColumn('articles', 'manages_stock', 'TINYINT(1) DEFAULT 1', 'sale_price');
  await ensureColumn('articles', 'is_product', 'TINYINT(1) DEFAULT 0', 'manages_stock');
  await ensureColumn('articles', 'is_supply', 'TINYINT(1) DEFAULT 1', 'is_product');
  await ensureColumn('articles', 'for_sale', 'TINYINT(1) DEFAULT 0', 'is_supply');

  await query(
    `CREATE TABLE IF NOT EXISTS recipes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      kitchen_id INT NULL,
      notes VARCHAR(255) NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_recipe_product (product_id),
      FOREIGN KEY (product_id) REFERENCES articles(id),
      FOREIGN KEY (kitchen_id) REFERENCES kitchens(id)
    )`
  );
  await ensureColumn('recipes', 'kitchen_id', 'INT NULL', 'product_id');

  await query(
    `CREATE TABLE IF NOT EXISTS recipe_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recipe_id INT NOT NULL,
      article_id INT NOT NULL,
      quantity DECIMAL(12,3) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_recipe_item (recipe_id, article_id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (article_id) REFERENCES articles(id)
    )`
  );
}

async function ensureCommerceSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS vat_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      code VARCHAR(20) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      business_name VARCHAR(150) NOT NULL,
      fantasy_name VARCHAR(150) NULL,
      cuit VARCHAR(20) NULL,
      vat_type_id INT NULL,
      gross_income_number VARCHAR(40) NULL,
      email VARCHAR(120) NULL,
      phone VARCHAR(50) NULL,
      address VARCHAR(255) NULL,
      city VARCHAR(120) NULL,
      province VARCHAR(120) NULL,
      postal_code VARCHAR(20) NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_suppliers_branch_cuit (branch_id, cuit),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (vat_type_id) REFERENCES vat_types(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      first_name VARCHAR(120) NOT NULL,
      last_name VARCHAR(120) NOT NULL,
      document_type VARCHAR(15) NOT NULL DEFAULT 'DNI',
      document_number VARCHAR(20) NULL,
      cuit VARCHAR(20) NULL,
      vat_type_id INT NULL,
      email VARCHAR(120) NULL,
      phone VARCHAR(50) NULL,
      address VARCHAR(255) NULL,
      city VARCHAR(120) NULL,
      province VARCHAR(120) NULL,
      postal_code VARCHAR(20) NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_customers_branch_document (branch_id, document_number),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (vat_type_id) REFERENCES vat_types(id)
    )`
  );
}

async function ensureAreasSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS dining_areas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_dining_area_branch_name (branch_id, name),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )`
  );

  await ensureColumn('tables_restaurant', 'area_id', 'INT NULL', 'branch_id');
  await ensureColumn('tables_restaurant', 'pos_x', 'INT NULL', 'capacity');
  await ensureColumn('tables_restaurant', 'pos_y', 'INT NULL', 'pos_x');
  await ensureColumn('dining_areas', 'map_layout', 'JSON NULL', 'name');

  if (!(await foreignKeyExists('tables_restaurant', 'area_id'))) {
    await query(
      `ALTER TABLE tables_restaurant
       ADD CONSTRAINT fk_tables_restaurant_area
       FOREIGN KEY (area_id) REFERENCES dining_areas(id)
       ON DELETE SET NULL`
    );
  }
}

async function ensureAfipSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS afip_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT NOT NULL UNIQUE,
      cuit VARCHAR(20) NULL,
      issuer_name VARCHAR(120) NULL,
      issuer_address VARCHAR(255) NULL,
      point_of_sale INT NOT NULL,
      environment ENUM('HOMOLOGACION','PRODUCCION') NOT NULL DEFAULT 'HOMOLOGACION',
      ws_mode ENUM('MOCK','MANUAL','AFIP') NOT NULL DEFAULT 'MOCK',
      cert_path VARCHAR(255) NULL,
      key_path VARCHAR(255) NULL,
      service_tax_id VARCHAR(20) NULL,
      ticket_logo_path VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )`
  );

  await ensureColumn('invoices', 'created_by', 'INT NULL', 'total');
  await ensureColumn('invoices', 'voucher_number', 'INT NULL', 'authorization_code');
  await ensureColumn('invoices', 'afip_response', 'JSON NULL', 'caea_id');
  await ensureColumn('afip_configs', 'issuer_name', 'VARCHAR(120) NULL', 'cuit');
  await ensureColumn('afip_configs', 'issuer_address', 'VARCHAR(255) NULL', 'issuer_name');
  await ensureColumn('afip_configs', 'ticket_logo_path', 'VARCHAR(255) NULL', 'service_tax_id');

  const wsModeColumnType = await getColumnType('afip_configs', 'ws_mode');
  if (wsModeColumnType && !wsModeColumnType.includes("'AFIP'")) {
    await query("ALTER TABLE afip_configs MODIFY ws_mode ENUM('MOCK','MANUAL','AFIP') NOT NULL DEFAULT 'MOCK'");
  }

  if (!(await foreignKeyExists('invoices', 'created_by'))) {
    await query(
      `ALTER TABLE invoices
       ADD CONSTRAINT fk_invoices_created_by
       FOREIGN KEY (created_by) REFERENCES users(id)`
    );
  }
}

module.exports = {
  ensureCashSchema,
};
