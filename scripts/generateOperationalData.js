#!/usr/bin/env node

const { pool } = require('../src/config/database');

function createRng(seed = 20260422) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function toMysqlDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function shiftDate(base, dayOffset, hour, minute = 0) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function ensureBranch(conn) {
  const [rows] = await conn.query('SELECT id FROM branches ORDER BY id LIMIT 1');
  if (rows.length) return rows[0].id;

  const [result] = await conn.query(
    'INSERT INTO branches (name, address) VALUES (?, ?)',
    ['RestoSur Centro', 'Av. Principal 1234']
  );
  return result.insertId;
}

async function ensureUsers(conn, branchId) {
  const [rows] = await conn.query('SELECT id, role FROM users WHERE branch_id = ?', [branchId]);
  const byRole = new Map(rows.map((u) => [u.role, u.id]));

  const defaults = [
    ['ADMIN', 'Admin', 'admin@restosur.local'],
    ['CAJERO', 'Caja', 'caja@restosur.local'],
    ['MOZO', 'Mozo', 'mozo@restosur.local'],
    ['COCINA', 'Cocina', 'cocina@restosur.local'],
  ];

  const out = {};
  for (const [role, name, email] of defaults) {
    if (byRole.has(role)) {
      out[role] = byRole.get(role);
      continue;
    }

    const [res] = await conn.query(
      `INSERT INTO users (branch_id, name, email, password_hash, role, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [branchId, name, email, '$2b$10$9hM5v8nQ6kYzT7gJ2fKk2uhK0kNF6gzVxHhVhUQZj6yy6J3W14t0K', role]
    );
    out[role] = res.insertId;
  }

  return out;
}

async function ensureTables(conn, branchId) {
  const [existing] = await conn.query('SELECT id FROM tables_restaurant WHERE branch_id = ? LIMIT 1', [branchId]);
  if (existing.length) {
    const [tables] = await conn.query('SELECT id FROM tables_restaurant WHERE branch_id = ?', [branchId]);
    return tables.map((t) => t.id);
  }

  const [areaRes] = await conn.query('INSERT INTO dining_areas (branch_id, name) VALUES (?, ?)', [branchId, 'Salón principal']);
  const areaId = areaRes.insertId;

  const tableIds = [];
  for (let i = 1; i <= 18; i++) {
    const [res] = await conn.query(
      `INSERT INTO tables_restaurant (branch_id, area_id, table_number, table_type, capacity, status)
       VALUES (?, ?, ?, 'CUADRADA', ?, 'LIBRE')`,
      [branchId, areaId, String(i), i <= 10 ? 4 : 6]
    );
    tableIds.push(res.insertId);
  }
  return tableIds;
}

async function ensureCatalog(conn) {
  const ensureByName = async (table, name, extraFields = {}, uniqueField = 'name') => {
    const [rows] = await conn.query(`SELECT id FROM ${table} WHERE ${uniqueField} = ? LIMIT 1`, [name]);
    if (rows.length) return rows[0].id;

    const keys = Object.keys(extraFields);
    const cols = [uniqueField, ...keys];
    const placeholders = cols.map(() => '?').join(', ');
    const values = [name, ...keys.map((k) => extraFields[k])];

    const [res] = await conn.query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return res.insertId;
  };

  const articleTypeProduct = await ensureByName('article_types', 'PRODUCTO', { description: 'Producto de venta' });
  const articleTypeSupply = await ensureByName('article_types', 'INSUMO', { description: 'Insumo de cocina y barra' });

  const unitUn = await ensureByName('measurement_units', 'Unidad', { code: 'UN', description: 'Unidad', allows_fraction: 0 });
  const unitKg = await ensureByName('measurement_units', 'Kilogramo', { code: 'KG', description: 'Peso', allows_fraction: 1 });
  const unitLt = await ensureByName('measurement_units', 'Litro', { code: 'LT', description: 'Volumen', allows_fraction: 1 });

  const catCocina = await ensureByName('categories', 'Cocina');
  const catBarra = await ensureByName('categories', 'Barra');

  const upsertArticle = async (article) => {
    const [rows] = await conn.query('SELECT id FROM articles WHERE sku = ? LIMIT 1', [article.sku]);
    if (rows.length) return rows[0].id;

    const [res] = await conn.query(
      `INSERT INTO articles
      (name, sku, article_type_id, measurement_unit_id, category_id, cost, sale_price, manages_stock, is_product, is_supply, for_sale, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        article.name,
        article.sku,
        article.article_type_id,
        article.measurement_unit_id,
        article.category_id,
        article.cost,
        article.sale_price,
        article.manages_stock,
        article.is_product,
        article.is_supply,
        article.for_sale,
      ]
    );
    return res.insertId;
  };

  const supplyDefs = [
    ['Harina 000', 'SUP-HARINA', unitKg, catCocina, 1200],
    ['Queso mozzarella', 'SUP-QUESO', unitKg, catCocina, 5200],
    ['Tomate triturado', 'SUP-TOMATE', unitKg, catCocina, 1800],
    ['Carne vacuna', 'SUP-CARNE', unitKg, catCocina, 7600],
    ['Papas congeladas', 'SUP-PAPAS', unitKg, catCocina, 3200],
    ['Aceite vegetal', 'SUP-ACEITE', unitLt, catCocina, 2600],
    ['Pan de hamburguesa', 'SUP-PAN', unitUn, catCocina, 350],
    ['Barril cerveza', 'SUP-BARRIL', unitLt, catBarra, 1400],
    ['Vino tinto', 'SUP-VINO', unitLt, catBarra, 2400],
    ['Hielo', 'SUP-HIELO', unitKg, catBarra, 650],
  ];

  const productDefs = [
    ['Pizza muzzarella', 'PROD-PIZZA', catCocina, 13500],
    ['Hamburguesa completa', 'PROD-BURGER', catCocina, 11800],
    ['Milanesa con papas', 'PROD-MILA', catCocina, 12800],
    ['Ensalada César', 'PROD-ENS', catCocina, 9800],
    ['Pinta de cerveza', 'PROD-PINTA', catBarra, 5200],
    ['Copa de vino', 'PROD-COPA', catBarra, 4800],
    ['Flan casero', 'PROD-FLAN', catCocina, 4200],
  ];

  const supplyIds = [];
  for (const [name, sku, unitId, categoryId, cost] of supplyDefs) {
    const id = await upsertArticle({
      name,
      sku,
      article_type_id: articleTypeSupply,
      measurement_unit_id: unitId,
      category_id: categoryId,
      cost,
      sale_price: 0,
      manages_stock: 1,
      is_product: 0,
      is_supply: 1,
      for_sale: 0,
    });
    supplyIds.push(id);
  }

  const productIds = [];
  for (const [name, sku, categoryId, salePrice] of productDefs) {
    const id = await upsertArticle({
      name,
      sku,
      article_type_id: articleTypeProduct,
      measurement_unit_id: unitUn,
      category_id: categoryId,
      cost: Math.round(salePrice * 0.35),
      sale_price: salePrice,
      manages_stock: 1,
      is_product: 1,
      is_supply: 0,
      for_sale: 1,
    });
    productIds.push(id);
  }

  return { supplyIds, productIds };
}

async function ensureSuppliers(conn, branchId, supplyIds) {
  const [vat] = await conn.query("SELECT id FROM vat_types WHERE code = 'CF' LIMIT 1");
  let vatId = vat[0]?.id;
  if (!vatId) {
    const [resVat] = await conn.query(
      "INSERT INTO vat_types (name, code, description, active) VALUES ('Consumidor Final', 'CF', 'Sin discriminación', 1)"
    );
    vatId = resVat.insertId;
  }

  const supplierNames = ['Distribuidora Norte', 'Mercado Mayorista Sur', 'Bebidas del Puerto'];
  const supplierIds = [];
  for (const name of supplierNames) {
    const [rows] = await conn.query(
      'SELECT id FROM suppliers WHERE branch_id = ? AND business_name = ? LIMIT 1',
      [branchId, name]
    );
    if (rows.length) {
      supplierIds.push(rows[0].id);
      continue;
    }

    const [res] = await conn.query(
      `INSERT INTO suppliers (branch_id, business_name, vat_type_id, city, active)
       VALUES (?, ?, ?, 'Buenos Aires', 1)`,
      [branchId, name, vatId]
    );
    supplierIds.push(res.insertId);
  }

  for (const supplierId of supplierIds) {
    for (const articleId of supplyIds) {
      await conn.query(
        'INSERT IGNORE INTO supplier_articles (supplier_id, article_id, is_default) VALUES (?, ?, 0)',
        [supplierId, articleId]
      );
    }
  }

  return supplierIds;
}

async function ensureRegisterAndReasons(conn, branchId, cashierId) {
  const [rows] = await conn.query('SELECT id FROM cash_registers WHERE branch_id = ? ORDER BY id LIMIT 1', [branchId]);
  let registerId = rows[0]?.id;
  if (!registerId) {
    const [res] = await conn.query(
      'INSERT INTO cash_registers (branch_id, name, active) VALUES (?, ?, 1)',
      [branchId, 'Caja principal']
    );
    registerId = res.insertId;
  }

  await conn.query(
    "INSERT IGNORE INTO cash_movement_reasons (description, type, active) VALUES ('Pago a proveedor', 'EGRESO', 1), ('Retiro de efectivo', 'EGRESO', 1), ('Aporte de cambio', 'INGRESO', 1)"
  );

  return { registerId, cashierId };
}

async function ensureStockRows(conn, branchId, articleIds) {
  for (const articleId of articleIds) {
    await conn.query(
      'INSERT IGNORE INTO stock (branch_id, article_id, quantity) VALUES (?, ?, 0)',
      [branchId, articleId]
    );
  }
}

async function generateOperationalData(days = 60, seed = 20260422) {
  const rng = createRng(seed);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const branchId = await ensureBranch(conn);
    const users = await ensureUsers(conn, branchId);
    const tableIds = await ensureTables(conn, branchId);
    const { supplyIds, productIds } = await ensureCatalog(conn);
    const supplierIds = await ensureSuppliers(conn, branchId, supplyIds);
    const { registerId } = await ensureRegisterAndReasons(conn, branchId, users.CAJERO);

    await ensureStockRows(conn, branchId, [...supplyIds, ...productIds]);

    const [productRows] = await conn.query(
      'SELECT id, sale_price, cost FROM articles WHERE id IN (?)',
      [productIds]
    );
    const products = productRows.map((p) => ({ id: p.id, salePrice: Number(p.sale_price), cost: Number(p.cost) }));

    const [supplyRows] = await conn.query('SELECT id, cost FROM articles WHERE id IN (?)', [supplyIds]);
    const supplies = supplyRows.map((s) => ({ id: s.id, cost: Number(s.cost) }));

    let totalSales = 0;
    let totalPurchaseOrders = 0;

    for (let i = days - 1; i >= 0; i--) {
      const day = shiftDate(new Date(), -i, 0, 0);
      const dayOfWeek = day.getUTCDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

      const openAt = shiftDate(day, 0, 10, 45);
      const closeAt = shiftDate(day, isWeekend ? 1 : 0, isWeekend ? 1 : 23, isWeekend ? 40 : 15);
      const openingBalance = randInt(rng, 35000, 65000);

      const [shiftRes] = await conn.query(
        `INSERT INTO cash_shifts
         (register_id, branch_id, user_id, status, opened_at, closed_at, opening_balance, expected_balance, real_balance, difference, opening_note, closing_note)
         VALUES (?, ?, ?, 'CERRADA', ?, ?, ?, 0, 0, 0, ?, ?)`,
        [
          registerId,
          branchId,
          users.CAJERO,
          toMysqlDatetime(openAt),
          toMysqlDatetime(closeAt),
          openingBalance,
          'Apertura automática para dataset histórico',
          'Cierre automático para dataset histórico',
        ]
      );
      const shiftId = shiftRes.insertId;

      await conn.query(
        `INSERT INTO cash_movements
         (shift_id, register_id, branch_id, user_id, type, payment_method, amount, reason, affects_balance, created_at)
         VALUES (?, ?, ?, ?, 'APERTURA', 'EFECTIVO', ?, 'Fondo inicial', 1, ?)`,
        [shiftId, registerId, branchId, users.CAJERO, openingBalance, toMysqlDatetime(openAt)]
      );

      if (rng() > 0.72) {
        const extraAt = shiftDate(day, 0, 16, randInt(rng, 0, 45));
        const extraAmount = randInt(rng, 5000, 15000);
        await conn.query(
          `INSERT INTO cash_movements
           (shift_id, register_id, branch_id, user_id, type, payment_method, amount, reason, affects_balance, created_at)
           VALUES (?, ?, ?, ?, 'INGRESO', 'EFECTIVO', ?, 'Aporte de cambio', 1, ?)`,
          [shiftId, registerId, branchId, users.CAJERO, extraAmount, toMysqlDatetime(extraAt)]
        );
      }

      if (rng() > 0.68) {
        const expenseAt = shiftDate(day, 0, 18, randInt(rng, 0, 40));
        const expenseAmount = randInt(rng, 3000, 12000);
        await conn.query(
          `INSERT INTO cash_movements
           (shift_id, register_id, branch_id, user_id, type, payment_method, amount, reason, affects_balance, created_at)
           VALUES (?, ?, ?, ?, 'EGRESO', 'EFECTIVO', ?, 'Pago menor operativo', 1, ?)`,
          [shiftId, registerId, branchId, users.CAJERO, expenseAmount, toMysqlDatetime(expenseAt)]
        );
      }

      const baseSales = isWeekend ? randInt(rng, 28, 48) : randInt(rng, 14, 30);
      const salesCount = dayOfWeek === 1 ? Math.max(8, Math.floor(baseSales * 0.6)) : baseSales;

      for (let s = 0; s < salesCount; s++) {
        const lunch = rng() < 0.44;
        const paidAt = lunch
          ? shiftDate(day, 0, randInt(rng, 12, 15), randInt(rng, 0, 59))
          : shiftDate(day, 0, randInt(rng, 20, isWeekend ? 23 : 22), randInt(rng, 0, 59));
        const openedAt = new Date(paidAt.getTime() - randInt(rng, 18, 55) * 60000);

        const [saleRes] = await conn.query(
          `INSERT INTO sales (branch_id, table_id, user_id, status, total, opened_at, paid_at)
           VALUES (?, ?, ?, 'PAGADA', 0, ?, ?)`,
          [branchId, pick(rng, tableIds), users.MOZO, toMysqlDatetime(openedAt), toMysqlDatetime(paidAt)]
        );
        const saleId = saleRes.insertId;

        const itemCount = randInt(rng, 1, 5);
        let saleTotal = 0;
        for (let item = 0; item < itemCount; item++) {
          const product = pick(rng, products);
          const quantity = rng() < 0.2 ? 2 : 1;
          saleTotal += product.salePrice * quantity;

          await conn.query(
            `INSERT INTO sale_items (sale_id, article_id, quantity, unit_price, kitchen_status, created_at)
             VALUES (?, ?, ?, ?, 'LISTO', ?)`,
            [saleId, product.id, quantity, product.salePrice, toMysqlDatetime(openedAt)]
          );

          await conn.query(
            `INSERT INTO stock_movements (branch_id, article_id, user_id, type, quantity, reason, created_at)
             VALUES (?, ?, ?, 'EGRESO', ?, 'Salida por venta', ?)`,
            [branchId, product.id, users.CAJERO, quantity, toMysqlDatetime(paidAt)]
          );
          await conn.query(
            'UPDATE stock SET quantity = quantity - ? WHERE branch_id = ? AND article_id = ?',
            [quantity, branchId, product.id]
          );
        }

        await conn.query('UPDATE sales SET total = ? WHERE id = ?', [saleTotal, saleId]);

        const paymentMethod = pick(rng, ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']);
        await conn.query(
          `INSERT INTO cash_movements
           (shift_id, register_id, branch_id, user_id, sale_id, type, payment_method, amount, reason, affects_balance, created_at)
           VALUES (?, ?, ?, ?, ?, 'VENTA', ?, ?, 'Cobro de mesa', 1, ?)`,
          [shiftId, registerId, branchId, users.CAJERO, saleId, paymentMethod, saleTotal, toMysqlDatetime(paidAt)]
        );

        totalSales += 1;
      }

      const purchaseChance = isWeekend ? 0.2 : 0.58;
      if (rng() < purchaseChance) {
        const supplierId = pick(rng, supplierIds);
        const createdAt = shiftDate(day, 0, randInt(rng, 8, 11), randInt(rng, 0, 59));

        const [poRes] = await conn.query(
          `INSERT INTO purchase_orders (branch_id, supplier_id, status, notes, created_at, updated_at)
           VALUES (?, ?, 'RECIBIDA_TOTAL', 'Reposición automática histórica', ?, ?)`,
          [branchId, supplierId, toMysqlDatetime(createdAt), toMysqlDatetime(createdAt)]
        );
        const poId = poRes.insertId;

        const [receiptRes] = await conn.query(
          `INSERT INTO purchase_order_receipts
           (purchase_order_id, branch_id, user_id, supplier_document_number, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            poId,
            branchId,
            users.CAJERO,
            `REM-${createdAt.getUTCFullYear()}${String(createdAt.getUTCMonth() + 1).padStart(2, '0')}${String(createdAt.getUTCDate()).padStart(2, '0')}-${poId}`,
            'Recepción automática histórica',
            toMysqlDatetime(createdAt),
          ]
        );

        const poItems = randInt(rng, 3, 6);
        const selectedSupplies = [...supplies].sort(() => rng() - 0.5).slice(0, poItems);

        let receiptTotal = 0;

        for (const supply of selectedSupplies) {
          const quantity = Number((randInt(rng, 2, 15) + rng()).toFixed(3));
          const unitCost = Number((supply.cost * (0.92 + rng() * 0.18)).toFixed(2));

          const [poiRes] = await conn.query(
            `INSERT INTO purchase_order_items
             (purchase_order_id, article_id, quantity_ordered, quantity_received, unit_cost, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [poId, supply.id, quantity, quantity, unitCost, toMysqlDatetime(createdAt), toMysqlDatetime(createdAt)]
          );

          await conn.query(
            `INSERT INTO stock_movements (branch_id, article_id, user_id, type, quantity, reason, created_at)
             VALUES (?, ?, ?, 'INGRESO', ?, 'Ingreso por compra a proveedor', ?)`,
            [branchId, supply.id, users.CAJERO, quantity, toMysqlDatetime(createdAt)]
          );
          await conn.query(
            'UPDATE stock SET quantity = quantity + ? WHERE branch_id = ? AND article_id = ?',
            [quantity, branchId, supply.id]
          );

          receiptTotal += quantity * unitCost;

          await conn.query(
            `INSERT INTO purchase_order_receipt_items
             (purchase_order_receipt_id, purchase_order_item_id, article_id, quantity_received, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [receiptRes.insertId, poiRes.insertId, supply.id, quantity, toMysqlDatetime(createdAt)]
          );
        }

        await conn.query(
          'UPDATE purchase_order_receipts SET notes = ? WHERE id = ?',
          [`Recepción automática. Total aprox $${receiptTotal.toFixed(2)}`, receiptRes.insertId]
        );

        await conn.query(
          `UPDATE purchase_orders
           SET status = 'RECIBIDA_TOTAL', updated_at = ?, closed_at = ?
           WHERE id = ?`,
          [toMysqlDatetime(createdAt), toMysqlDatetime(createdAt), poId]
        );

        totalPurchaseOrders += 1;
      }

      const [cashRows] = await conn.query(
        `SELECT type, amount FROM cash_movements
         WHERE shift_id = ? AND affects_balance = 1`,
        [shiftId]
      );

      let expected = 0;
      for (const row of cashRows) {
        const amount = Number(row.amount);
        if (row.type === 'EGRESO') expected -= amount;
        else expected += amount;
      }

      const drift = randInt(rng, -900, 900);
      const real = Math.max(0, expected + drift);

      await conn.query(
        `INSERT INTO cash_movements
         (shift_id, register_id, branch_id, user_id, type, payment_method, amount, reason, affects_balance, created_at)
         VALUES (?, ?, ?, ?, 'CIERRE', 'EFECTIVO', ?, 'Cierre de jornada', 0, ?)`,
        [shiftId, registerId, branchId, users.CAJERO, real, toMysqlDatetime(closeAt)]
      );

      await conn.query(
        `UPDATE cash_shifts
         SET expected_balance = ?, real_balance = ?, difference = ?
         WHERE id = ?`,
        [expected, real, real - expected, shiftId]
      );
    }

    await conn.commit();

    console.log(`Datos históricos generados: ${days} días, ${totalSales} ventas y ${totalPurchaseOrders} compras.`);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

(async () => {
  const daysArg = Number(process.argv[2] || 60);
  const days = Number.isFinite(daysArg) && daysArg > 0 ? Math.min(180, Math.floor(daysArg)) : 60;

  try {
    await generateOperationalData(days);
  } catch (err) {
    console.error('No se pudo generar el dataset operacional:', err.message);
    process.exit(1);
  }
})();
