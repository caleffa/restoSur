const { pool } = require('../../config/database');
const { query } = require('../../repositories/baseRepository');

async function list() {
  return query(
    `SELECT r.*, p.name AS product_name,
            COUNT(ri.id) AS items_count,
            ROUND(COALESCE(SUM(ri.quantity * a.cost), 0), 2) AS estimated_cost
     FROM recipes r
     JOIN articles p ON p.id = r.product_id
     LEFT JOIN recipe_items ri ON ri.recipe_id = r.id
     LEFT JOIN articles a ON a.id = ri.article_id
     GROUP BY r.id, p.name
     ORDER BY r.id DESC`
  );
}

async function findById(id) {
  const recipes = await query(
    `SELECT r.*, p.name AS product_name
     FROM recipes r
     JOIN articles p ON p.id = r.product_id
     WHERE r.id = ?
     LIMIT 1`,
    [id]
  );

  if (!recipes[0]) return null;

  const items = await query(
    `SELECT ri.id, ri.recipe_id, ri.article_id, ri.quantity,
            a.name AS article_name, a.sku AS article_sku, a.cost AS article_cost,
            mu.id AS measurement_unit_id, mu.name AS measurement_unit_name,
            mu.code AS measurement_unit_code, mu.allows_fraction AS measurement_unit_allows_fraction
     FROM recipe_items ri
     JOIN articles a ON a.id = ri.article_id
     JOIN measurement_units mu ON mu.id = a.measurement_unit_id
     WHERE ri.recipe_id = ?
     ORDER BY ri.id ASC`,
    [id]
  );

  return { ...recipes[0], items };
}

async function findByProductId(productId) {
  const rows = await query('SELECT * FROM recipes WHERE product_id = ? LIMIT 1', [productId]);
  return rows[0] || null;
}

async function findActiveItemsByProductIds(productIds, conn) {
  if (!productIds.length) return [];
  const placeholders = productIds.map(() => '?').join(',');

  return query(
    `SELECT r.product_id, ri.article_id, ri.quantity
     FROM recipes r
     JOIN recipe_items ri ON ri.recipe_id = r.id
     WHERE r.active = 1
       AND r.product_id IN (${placeholders})`,
    productIds,
    conn
  );
}

async function findArticlesByIds(articleIds) {
  if (!articleIds.length) return [];

  const placeholders = articleIds.map(() => '?').join(',');
  return query(
    `SELECT a.id, a.name, a.is_supply, a.measurement_unit_id,
            mu.name AS measurement_unit_name, mu.code AS measurement_unit_code,
            mu.allows_fraction AS measurement_unit_allows_fraction
     FROM articles a
     JOIN measurement_units mu ON mu.id = a.measurement_unit_id
     WHERE a.id IN (${placeholders})`,
    articleIds
  );
}

async function create(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const result = await query(
      'INSERT INTO recipes (product_id, notes, active) VALUES (?, ?, ?)',
      [data.productId, data.notes, data.active ? 1 : 0],
      conn
    );

    for (const item of data.items) {
      await query(
        'INSERT INTO recipe_items (recipe_id, article_id, quantity) VALUES (?, ?, ?)',
        [result.insertId, item.articleId, item.quantity],
        conn
      );
    }

    await conn.commit();
    return { id: result.insertId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function update(id, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await query(
      'UPDATE recipes SET product_id = ?, notes = ?, active = ? WHERE id = ?',
      [data.productId, data.notes, data.active ? 1 : 0, id],
      conn
    );

    await query('DELETE FROM recipe_items WHERE recipe_id = ?', [id], conn);

    for (const item of data.items) {
      await query(
        'INSERT INTO recipe_items (recipe_id, article_id, quantity) VALUES (?, ?, ?)',
        [id, item.articleId, item.quantity],
        conn
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function remove(id) {
  await query('DELETE FROM recipes WHERE id = ?', [id]);
}

module.exports = {
  list,
  findById,
  findByProductId,
  findActiveItemsByProductIds,
  findArticlesByIds,
  create,
  update,
  remove,
};
