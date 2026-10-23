const express = require('express');
const { listDishes } = require('../services/dishes');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    res.json({ dishes: await listDishes() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
