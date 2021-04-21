const express = require('express');
const router = express.Router();
const test = require('../utils/Test')

/* GET home page. */
router.get('/deleteTestRegister', test.deleteRegisterUserTest);

module.exports = router;
