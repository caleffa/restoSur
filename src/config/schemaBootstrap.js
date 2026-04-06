const { query } = require('../repositories/baseRepository');

async function ensureCashSchema() {
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
}

module.exports = {
  ensureCashSchema,
};
