const express = require('express');
const router = express.Router();
const User = require('../controller/User');
/**
  Base Route:
    /api/users/
**/
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/login', User.login);
router.post('/login', User.login);
router.get('/logout', User.logout);
router.post('/logout', User.logout);
router.get('/register', User.finishRegistration);
router.post('/register', User.finishRegistration);
router.get('/validateRegistration', User.startRegistration);
router.post('/validateRegistration', User.startRegistration);

module.exports = router;
