const repo = require('./articles.repository');
const articleTypeRepo = require('../articleTypes/articleTypes.repository');
const measurementUnitRepo = require('../measurementUnits/measurementUnits.repository');
const categoriesRepo = require('../categories/categories.repository');
const suppliersRepo = require('../suppliers/suppliers.repository');
const AppError = require('../../utils/appError');

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizePayload(data) {
  const name = String(data.name || '').trim();
  const sku = String(data.sku || '').trim().toUpperCase();
  const barcode = data.barcode ? String(data.barcode).trim() : null;
  const articleTypeId = Number(data.articleTypeId);
  const measurementUnitId = Number(data.measurementUnitId);
  const categoryId = toOptionalNumber(data.categoryId);
  const supplierId = toOptionalNumber(data.supplierId);
  const cost = Number(data.cost);
  const salePrice = Number(data.salePrice ?? data.price ?? 0);
  const stockMinimum = toOptionalNumber(data.stockMinimum ?? data.stock_minimum ?? data.stockMinimo);

  if (!name) throw new AppError('El nombre del artículo es obligatorio', 400);
  if (!sku) throw new AppError('El SKU del artículo es obligatorio', 400);
  if (!articleTypeId) throw new AppError('El tipo de artículo es obligatorio', 400);
  if (!measurementUnitId) throw new AppError('La unidad de medida es obligatoria', 400);
  if (!Number.isFinite(cost) || cost < 0) throw new AppError('El costo del artículo es inválido', 400);
  if (!Number.isFinite(salePrice) || salePrice < 0) throw new AppError('El precio de venta es inválido', 400);
  if (stockMinimum !== null && stockMinimum < 0) {
    throw new AppError('El stock mínimo del artículo es inválido', 400);
  }

  const isProduct = data.isProduct === undefined ? false : Boolean(data.isProduct);
  const isSupply = data.isSupply === undefined ? false : Boolean(data.isSupply);
  const forSale = data.forSale === undefined ? false : Boolean(data.forSale);

  if (isSupply && !isProduct && forSale) {
    throw new AppError('Un insumo no puede estar a la venta', 400);
  }


  return {
    name,
    sku,
    barcode,
    articleTypeId,
    measurementUnitId,
    categoryId,
    supplierId,
    cost,
    salePrice,
    stockMinimum,
    managesStock: data.managesStock === undefined ? true : Boolean(data.managesStock),
    isProduct,
    isSupply,
    forSale,
    active: data.active === undefined ? true : Boolean(data.active),
  };
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'si', 'sí', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
  return defaultValue;
}

function splitCsvLine(line, delimiter) {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(csvRaw) {
  if (!csvRaw || typeof csvRaw !== 'string') {
    throw new AppError('Debe enviar el contenido CSV en el campo "csv"', 400);
  }

  const lines = csvRaw
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new AppError('El archivo CSV está vacío', 400);
  }

  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map((header) => header.trim().toLowerCase());
  if (!headers.length) throw new AppError('No se detectaron columnas en el CSV', 400);

  const rows = lines.slice(1).map((line, rowIndex) => {
    const values = splitCsvLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return { lineNumber: rowIndex + 2, row };
  });

  return { headers, rows };
}

function firstNonEmpty(...values) {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
  return found === undefined ? '' : String(found).trim();
}

async function resolveReferenceIds(csvRow, refs) {
  const articleTypeValue = firstNonEmpty(csvRow.article_type_id, csvRow.article_type_name, csvRow.article_type);
  const unitValue = firstNonEmpty(
    csvRow.measurement_unit_id,
    csvRow.measurement_unit_code,
    csvRow.measurement_unit_name,
    csvRow.measurement_unit,
  );
  const categoryValue = firstNonEmpty(csvRow.category_id, csvRow.category_name, csvRow.category);

  let articleTypeId = Number(articleTypeValue);
  if (!articleTypeId) {
    articleTypeId = refs.articleTypesByName.get(articleTypeValue.toLowerCase()) || 0;
  }

  let measurementUnitId = Number(unitValue);
  if (!measurementUnitId) {
    measurementUnitId = refs.unitsByCode.get(unitValue.toLowerCase())
      || refs.unitsByName.get(unitValue.toLowerCase())
      || 0;
  }

  let categoryId = null;
  if (categoryValue) {
    const parsedCategory = Number(categoryValue);
    categoryId = Number.isFinite(parsedCategory) && parsedCategory > 0
      ? parsedCategory
      : refs.categoriesByName.get(categoryValue.toLowerCase()) || null;
  }

  return { articleTypeId, measurementUnitId, categoryId };
}

async function validateReferences(data) {
  const [articleType, measurementUnit, category, supplier] = await Promise.all([
    articleTypeRepo.findById(data.articleTypeId),
    measurementUnitRepo.findById(data.measurementUnitId),
    data.categoryId ? categoriesRepo.findById(data.categoryId) : Promise.resolve(null),
    data.supplierId ? suppliersRepo.findById(data.supplierId) : Promise.resolve(null),
  ]);

  if (!articleType) throw new AppError('Tipo de artículo no encontrado', 404);
  if (!measurementUnit) throw new AppError('Unidad de medida no encontrada', 404);
  if (data.categoryId && !category) throw new AppError('Categoría no encontrada', 404);
  if (data.supplierId && !supplier) throw new AppError('Proveedor no encontrado', 404);
}

async function ensureUniqueFields(data, currentId = null) {
  const existingSku = await repo.findBySku(data.sku);
  if (existingSku && existingSku.id !== currentId) {
    throw new AppError('Ya existe un artículo con ese SKU', 409);
  }

  if (data.barcode) {
    const existingBarcode = await repo.findByBarcode(data.barcode);
    if (existingBarcode && existingBarcode.id !== currentId) {
      throw new AppError('Ya existe un artículo con ese código de barras', 409);
    }
  }
}

function normalizeListFilters(query) {
  const parseBool = (value) => {
    if (value === undefined) return undefined;
    return ['1', 'true', 'si', 'yes'].includes(String(value).toLowerCase());
  };

  return {
    isProduct: parseBool(query.isProduct),
    isSupply: parseBool(query.isSupply),
    forSale: parseBool(query.forSale),
  };
}

async function listArticles(filters = {}) {
  return repo.list(normalizeListFilters(filters));
}

async function getArticleById(id) {
  const articleId = Number(id);
  if (!articleId) throw new AppError('ID de artículo inválido', 400);

  const article = await repo.findById(articleId);
  if (!article) throw new AppError('Artículo no encontrado', 404);
  return article;
}

async function createArticle(data) {
  const payload = normalizePayload(data);
  await validateReferences(payload);
  await ensureUniqueFields(payload);
  const created = await repo.create(payload);
  await repo.setPreferredSupplier(created.id, payload.supplierId);
  return created;
}

async function importArticlesFromCsv(csvRaw) {
  const parsed = parseCsv(csvRaw);
  if (!parsed.rows.length) {
    throw new AppError('El CSV no tiene filas para importar', 400);
  }

  const [articleTypes, measurementUnits, categories] = await Promise.all([
    articleTypeRepo.list(),
    measurementUnitRepo.list(),
    categoriesRepo.list(),
  ]);

  const refs = {
    articleTypesByName: new Map(articleTypes.map((item) => [String(item.name || '').trim().toLowerCase(), Number(item.id)])),
    unitsByCode: new Map(measurementUnits.map((item) => [String(item.code || '').trim().toLowerCase(), Number(item.id)])),
    unitsByName: new Map(measurementUnits.map((item) => [String(item.name || '').trim().toLowerCase(), Number(item.id)])),
    categoriesByName: new Map(categories.map((item) => [String(item.name || '').trim().toLowerCase(), Number(item.id)])),
  };

  let imported = 0;
  const errors = [];

  for (const entry of parsed.rows) {
    try {
      const resolved = await resolveReferenceIds(entry.row, refs);
      const payload = normalizePayload({
        name: firstNonEmpty(entry.row.name),
        sku: firstNonEmpty(entry.row.sku),
        barcode: firstNonEmpty(entry.row.barcode) || null,
        articleTypeId: resolved.articleTypeId,
        measurementUnitId: resolved.measurementUnitId,
        categoryId: resolved.categoryId,
        cost: firstNonEmpty(entry.row.cost, entry.row.costo),
        salePrice: firstNonEmpty(entry.row.sale_price, entry.row.saleprice, entry.row.precio_venta),
        stockMinimum: firstNonEmpty(entry.row.stock_minimum, entry.row.stock_minimo),
        managesStock: parseBoolean(firstNonEmpty(entry.row.manages_stock, entry.row.maneja_stock), true),
        isProduct: parseBoolean(firstNonEmpty(entry.row.is_product, entry.row.es_producto), false),
        isSupply: parseBoolean(firstNonEmpty(entry.row.is_supply, entry.row.es_insumo), false),
        forSale: parseBoolean(firstNonEmpty(entry.row.for_sale, entry.row.para_venta), false),
        active: parseBoolean(firstNonEmpty(entry.row.active, entry.row.activo), true),
      });

      await validateReferences(payload);
      await ensureUniqueFields(payload);
      await repo.create(payload);
      imported += 1;
    } catch (error) {
      errors.push({
        line: entry.lineNumber,
        sku: firstNonEmpty(entry.row.sku) || null,
        message: error?.message || 'Error no identificado en fila',
      });
    }
  }

  return {
    totalRows: parsed.rows.length,
    imported,
    errorsCount: errors.length,
    errors,
  };
}

function escapeCsvValue(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

async function generateImportTemplateCsv() {
  const articleTypes = await articleTypeRepo.list();
  const header = [
    'name',
    'sku',
    'barcode',
    'article_type_id',
    'article_type_name',
    'measurement_unit_id',
    'measurement_unit_code',
    'measurement_unit_name',
    'category_id',
    'category_name',
    'cost',
    'sale_price',
    'stock_minimum',
    'manages_stock',
    'is_product',
    'is_supply',
    'for_sale',
    'active',
  ];

  const firstType = articleTypes[0];
  const exampleRows = [
    {
      name: 'Cerveza Rubia 500ml',
      sku: 'CER-RUBIA-500',
      barcode: '7791234567890',
      article_type_id: firstType?.id || '',
      article_type_name: firstType?.name || 'Bebida',
      measurement_unit_id: '',
      measurement_unit_code: 'UN',
      measurement_unit_name: '',
      category_id: '',
      category_name: 'Cervezas',
      cost: '850.00',
      sale_price: '1750.00',
      stock_minimum: '10',
      manages_stock: 'true',
      is_product: 'true',
      is_supply: 'false',
      for_sale: 'true',
      active: 'true',
    },
    {
      name: 'Lúpulo Cascade',
      sku: 'INS-LUPULO-CAS',
      barcode: '',
      article_type_id: firstType?.id || '',
      article_type_name: firstType?.name || 'Insumo',
      measurement_unit_id: '',
      measurement_unit_code: 'KG',
      measurement_unit_name: '',
      category_id: '',
      category_name: 'Insumos',
      cost: '12000.00',
      sale_price: '0',
      stock_minimum: '5',
      manages_stock: 'true',
      is_product: 'false',
      is_supply: 'true',
      for_sale: 'false',
      active: 'true',
    },
  ];

  return [header.join(','), ...exampleRows.map((row) => header.map((column) => escapeCsvValue(row[column])).join(','))].join('\n');
}

async function updateArticle(id, data) {
  const articleId = Number(id);
  if (!articleId) throw new AppError('ID de artículo inválido', 400);

  const current = await repo.findById(articleId);
  if (!current) throw new AppError('Artículo no encontrado', 404);

  const payload = normalizePayload(data);
  await validateReferences(payload);
  await ensureUniqueFields(payload, articleId);
  await repo.update(articleId, payload);
  await repo.setPreferredSupplier(articleId, payload.supplierId);
}

async function removeArticle(id) {
  const articleId = Number(id);
  if (!articleId) throw new AppError('ID de artículo inválido', 400);

  const current = await repo.findById(articleId);
  if (!current) throw new AppError('Artículo no encontrado', 404);

  await repo.remove(articleId);
}

module.exports = {
  listArticles,
  getArticleById,
  createArticle,
  importArticlesFromCsv,
  generateImportTemplateCsv,
  updateArticle,
  removeArticle,
};
