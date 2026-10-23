const { db, close } = require('./index');

const ingredients = [
  ['Paneer', ['milk']], ['Tomato', []], ['Onion', []], ['Cashew', ['cashew']],
  ['Cream', ['milk']], ['Rice', []], ['Peas', []], ['Chickpea flour', ['gluten']],
  ['Chickpeas', []], ['Wheat flour', ['gluten']], ['Potato', []], ['Lentils', []],
  ['Butter', ['milk']], ['Dosa batter', ['gluten']], ['Flattened rice', []],
  ['Peanuts', ['peanut']], ['Pav bread', ['gluten']], ['Soy sauce', ['soy']],
  ['Sesame oil', ['sesame']], ['Spices', []]
];
const dishes = [
  ['Paneer Tikka Masala', ['Paneer', 'Tomato', 'Onion', 'Cashew', 'Cream', 'Spices']],
  ['Veg Biryani', ['Rice', 'Peas', 'Onion', 'Cashew', 'Spices']],
  ['Chole Bhature', ['Chickpeas', 'Chickpea flour', 'Wheat flour', 'Onion', 'Tomato', 'Spices']],
  ['Masala Dosa', ['Dosa batter', 'Potato', 'Peanuts', 'Spices']],
  ['Poha', ['Flattened rice', 'Peanuts', 'Onion', 'Spices']],
  ['Dal Tadka', ['Lentils', 'Butter', 'Tomato', 'Onion', 'Spices']],
  ['Pav Bhaji', ['Pav bread', 'Potato', 'Tomato', 'Onion', 'Butter', 'Spices']],
  ['Samosa', ['Wheat flour', 'Potato', 'Peas', 'Spices']]
];
const checklistItems = ['Handwash completed', 'Gloves worn', 'Surface sanitised', 'Raw/cooked separation', 'Apron and hairnet worn'];
const storageItems = [
  ['Fresh Paneer', '2026-10-25', 5, 4],
  ['Cooked Rice', '2026-10-23', 5, 6],
  ['Tomatoes', '2026-10-27', 10, 8],
  ['Cream', '2026-10-24', 5, 4]
];

function resetStorageItems() {
  for (const [name, expiryDate, tempLimit, currentTemp] of storageItems) {
    db.prepare('INSERT INTO storage_items (name, expiry_date, temp_limit_c, current_temp_c) VALUES (?, ?, ?, ?)')
      .run(name, expiryDate, tempLimit, currentTemp);
  }
}

function seed() {
  db.transaction(() => {
    const ingredientIds = new Map();
    for (const [name, tags] of ingredients) {
      const result = db.prepare('INSERT INTO ingredients (name) VALUES (?)').run(name);
      ingredientIds.set(name, result.lastInsertRowid);
      for (const tag of tags) db.prepare('INSERT INTO ingredient_allergens (ingredient_id, allergen_tag) VALUES (?, ?)').run(result.lastInsertRowid, tag);
    }
    for (const [name, ingredientNames] of dishes) {
      const dish = db.prepare('INSERT INTO dishes (name) VALUES (?)').run(name);
      for (const ingredientName of ingredientNames) db.prepare('INSERT INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)').run(dish.lastInsertRowid, ingredientIds.get(ingredientName));
    }
    for (const name of checklistItems) db.prepare('INSERT INTO checklist_items (name) VALUES (?)').run(name);
    resetStorageItems();
  })();
  console.log(`Seeded ${dishes.length} dishes, ${ingredients.length} ingredients, ${checklistItems.length} checklist items, and ${storageItems.length} storage items.`);
}

if (require.main === module) {
  try { seed(); close(); } catch (error) { console.error('Database seed failed:', error.message); process.exitCode = 1; }
}

module.exports = { seed, resetStorageItems };
