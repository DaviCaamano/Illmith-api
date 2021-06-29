const express = require('express');
const router = express.Router();
const test = require('../utils/test')

/* GET home page. */
router.get('/', test.general);

module.exports = router;
