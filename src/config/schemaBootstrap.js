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
  await ensureColumn('tables_restaurant', 'capacity', 'INT NOT NULL DEFAULT 4', 'table_number');
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
      observation VARCHAR(255) NULL,
      affects_balance TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shift_id) REFERENCES cash_shifts(id),
      FOREIGN KEY (register_id) REFERENCES cash_registers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  );

  await ensureColumn('cash_movements', 'shift_id', 'INT NULL', 'id');
  await ensureColumn('cash_movements', 'register_id', 'INT NULL', 'shift_id');
  await ensureColumn('cash_movements', 'branch_id', 'INT NULL', 'register_id');
  await ensureColumn('cash_movements', 'payment_method', 'VARCHAR(30) NULL', 'type');
  await ensureColumn('cash_movements', 'reference', 'VARCHAR(60) NULL', 'payment_method');
  await ensureColumn('cash_movements', 'reason', 'VARCHAR(255) NULL', 'amount');
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
}



async function ensureArticlesSchema() {
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
      cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (article_type_id) REFERENCES article_types(id),
      FOREIGN KEY (measurement_unit_id) REFERENCES measurement_units(id)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS recipes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      notes VARCHAR(255) NULL,
      active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_recipe_product (product_id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`
  );

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
