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
  observation VARCHAR(255) NULL,
  affects_balance TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES cash_shifts(id),
  FOREIGN KEY (register_id) REFERENCES cash_registers(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  has_stock TINYINT(1) DEFAULT 1,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock_branch_product (branch_id, product_id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('INGRESO','EGRESO','AJUSTE') NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE tables_restaurant (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  table_number VARCHAR(20) NOT NULL,
  status ENUM('LIBRE','OCUPADA','CUENTA_PEDIDA','CERRADA') DEFAULT 'LIBRE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
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
  product_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  kitchen_status ENUM('PENDIENTE','ENVIADO','PREPARANDO','LISTO') DEFAULT 'PENDIENTE',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE kitchen_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  branch_id INT NOT NULL,
  status ENUM('PENDIENTE','PREPARANDO','LISTO') DEFAULT 'PENDIENTE',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);


CREATE TABLE afip_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL UNIQUE,
  cuit VARCHAR(20) NULL,
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
