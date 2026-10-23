const express = require('express');
const { db } = require('../../db');
const { findDishWithAllergens } = require('../services/dishes');
const { createQrData } = require('../services/qr');
const { createIncident } = require('../services/incidentEngine');
const rules = require('../config/rules');

const router = express.Router();

function validateOrder(body) {
  const dishId = Number(body.dish_id);
  const cookTemp = Number(body.cook_temp_c);
  const cookTime = Number(body.cook_time_min);
  if (!Number.isInteger(dishId) || !Number.isFinite(cookTemp) || cookTemp < 0 ||
      !Number.isInteger(cookTime) || cookTime <= 0 || typeof body.hygiene_ok !== 'boolean') {
    return null;
  }
  return { dishId, cookTemp, cookTime, hygieneOk: body.hygiene_ok };
}

router.post('/', async (req, res, next) => {
  const input = validateOrder(req.body);
  if (!input) return res.status(400).json({ error: 'dish_id, cook_temp_c, cook_time_min, and boolean hygiene_ok are required' });
  try {
    const dish = await findDishWithAllergens(input.dishId);
    if (!dish) return res.status(400).json({ error: 'dish_id does not exist' });
    const result = db.prepare(
      `INSERT INTO orders (order_number, dish_id, cook_temp_c, cook_time_min, hygiene_ok)
       VALUES (COALESCE((SELECT MAX(order_number) + 1 FROM orders), 1042), ?, ?, ?, ?)`
    ).run(input.dishId, input.cookTemp, input.cookTime, input.hygieneOk ? 1 : 0);
    const savedOrder = db.prepare(
      'SELECT id, order_number, dish_id, created_at, cook_temp_c, cook_time_min, hygiene_ok FROM orders WHERE id = ?'
    ).get(result.lastInsertRowid);
    const order = { ...savedOrder, hygiene_ok: Boolean(savedOrder.hygiene_ok), dish_name: dish.name, allergens: dish.allergens };
    if (input.cookTemp < rules.SAFE_COOK_TEMP_C) {
      createIncident({
        type: 'Cooking temperature',
        severity: 'High',
        sourceRef: `order:${order.id}:cooking-temperature`,
        orderId: order.id,
        note: `Recorded cooking temperature ${input.cookTemp}°C`
      });
    }
    const qr = await createQrData(order.id);
    res.status(201).json({ order, qr_url: qr.url, qr_code_png: qr.pngDataUrl });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const rows = db.prepare(
      `SELECT o.id, o.order_number, o.created_at, o.cook_temp_c, o.cook_time_min, o.hygiene_ok,
              d.name AS dish_name,
              COALESCE((
                SELECT group_concat(allergen_tag, ',') FROM (
                  SELECT DISTINCT ia.allergen_tag
                  FROM dish_ingredients di2
                  JOIN ingredient_allergens ia ON ia.ingredient_id = di2.ingredient_id
                  WHERE di2.dish_id = o.dish_id ORDER BY ia.allergen_tag
                )
              ), '') AS allergens_csv
       FROM orders o
       JOIN dishes d ON d.id = o.dish_id
       ORDER BY o.created_at DESC LIMIT 50`
    ).all().map((row) => ({
      ...row,
      hygiene_ok: Boolean(row.hygiene_ok),
      allergens: row.allergens_csv ? row.allergens_csv.split(',') : []
    }));
    res.json({ orders: rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
