const { db } = require('../../db');

const dishAllergens = `
  SELECT d.id, d.name,
    COALESCE((
      SELECT group_concat(allergen_tag, ',')
      FROM (
        SELECT DISTINCT ia.allergen_tag
        FROM dish_ingredients di2
        JOIN ingredient_allergens ia ON ia.ingredient_id = di2.ingredient_id
        WHERE di2.dish_id = d.id
        ORDER BY ia.allergen_tag
      )
    ), '') AS allergens_csv
  FROM dishes d
`;

function mapDish(row) {
  return { id: row.id, name: row.name, allergens: row.allergens_csv ? row.allergens_csv.split(',') : [] };
}

async function findDishWithAllergens(id) {
  const row = db.prepare(`${dishAllergens} WHERE d.id = ?`).get(id);
  return row ? mapDish(row) : null;
}

async function listDishes() {
  return db.prepare(`${dishAllergens} ORDER BY d.name`).all().map(mapDish);
}

module.exports = { findDishWithAllergens, listDishes };
