const express = require('express');
const router = express.Router();
const test = require('../utils/test')

/* GET home page. */
router.get('/deleteTestRegister', test.deleteRegisterUserTest);

module.exports = router;
