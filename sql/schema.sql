CREATE DATABASE IF NOT EXISTS restosur;
USE restosur;

CREATE TABLE branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','CAJERO','MOZO','COCINA') NOT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE cash_registers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_register_branch_name (branch_id, name),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE cash_shifts (
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
);

CREATE TABLE cash_movement_reasons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description VARCHAR(100) NOT NULL,
  type ENUM('INGRESO','EGRESO') NOT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cash_reason_desc (description, type)
);


CREATE TABLE cash_movements (
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
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE article_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE measurement_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  allows_fraction TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE articles (
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
);


CREATE TABLE kitchen_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE kitchens (
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
);


CREATE TABLE recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  kitchen_id INT NOT NULL,
  notes VARCHAR(255) NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recipe_product (product_id),
  FOREIGN KEY (product_id) REFERENCES articles(id),
  FOREIGN KEY (kitchen_id) REFERENCES kitchens(id)
);

CREATE TABLE recipe_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  article_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recipe_item (recipe_id, article_id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

CREATE TABLE stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  article_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock_branch_article (branch_id, article_id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

CREATE TABLE stock_movements (
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
);


CREATE TABLE vat_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  description VARCHAR(100) NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
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
);

CREATE TABLE customers (
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
);

CREATE TABLE dining_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dining_area_branch_name (branch_id, name),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE tables_restaurant (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  area_id INT NULL,
  table_number VARCHAR(20) NOT NULL,
  table_type ENUM('REDONDA','CUADRADA','RECTANGULAR_HORIZONTAL','RECTANGULAR_VERTICAL') NOT NULL DEFAULT 'CUADRADA',
  capacity INT NOT NULL DEFAULT 4,
  status ENUM('LIBRE','OCUPADA','CUENTA_PEDIDA','CERRADA') DEFAULT 'LIBRE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (area_id) REFERENCES dining_areas(id) ON DELETE SET NULL,
  UNIQUE KEY uq_branch_table (branch_id, table_number)
);

CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  table_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('ABIERTA','PAGADA','CANCELADA') DEFAULT 'ABIERTA',
  total DECIMAL(12,2) DEFAULT 0,
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (table_id) REFERENCES tables_restaurant(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  article_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  kitchen_status ENUM('PENDIENTE','ENVIADO','PREPARANDO','LISTO') DEFAULT 'PENDIENTE',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

CREATE TABLE kitchen_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  sale_item_id INT NOT NULL,
  branch_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  kitchen_id INT NULL,
  user_id INT NULL,
  status ENUM('PENDIENTE','PREPARANDO','LISTO') DEFAULT 'PENDIENTE',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (kitchen_id) REFERENCES kitchens(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);


CREATE TABLE afip_configs (
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
);

CREATE TABLE afip_caea (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  caea_code VARCHAR(20) NOT NULL,
  period_year INT NOT NULL,
  period_half INT NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_caea_code (caea_code),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  branch_id INT NOT NULL,
  invoice_type ENUM('A','B','C') NOT NULL,
  authorization_type ENUM('CAE','CAEA') NOT NULL,
  authorization_code VARCHAR(20) NOT NULL,
  voucher_number INT NULL,
  cae_expiration DATE NULL,
  caea_id INT NULL,
  afip_response JSON NULL,
  total DECIMAL(12,2) NOT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (caea_id) REFERENCES afip_caea(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);


CREATE TABLE system_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  entity VARCHAR(50),
  entity_id INT,
  event_type VARCHAR(50),
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);