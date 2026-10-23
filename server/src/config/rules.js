const SAFE_COOK_TEMP_C = 75;
const STORAGE_EXPIRY_WARNING_DAYS = 2;

const rules = {
  SAFE_COOK_TEMP_C,
  STORAGE_EXPIRY_WARNING_DAYS,
  complaintSeverity: {
    'Allergen concern': 'High',
    'Foreign object': 'Medium',
    Undercooked: 'Medium'
  }
};

module.exports = rules;
