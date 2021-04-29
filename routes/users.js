const express = require('express');
const router = express.Router();
const user = require('../controller/user');
const rateLimit = require('../middleware/rateFilter')
//Middleware
const validate = require('../middleware/validateUser');
/**
  Base Route:
    /api/users/
**/
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/validate', validate, user.validate);
router.post('/validate', validate, user.validate);

router.get('/login', rateLimit, user.login);
router.post('/login', rateLimit, user.login);

router.get('/logout', user.logout);
router.post('/logout', user.logout);

router.get('/register', user.finishRegistration);
router.post('/register', user.finishRegistration);

router.get('/validateRegistration', rateLimit, user.startRegistration);
router.post('/validateRegistration', rateLimit, user.startRegistration);

router.get('/resetPassword', user.finishPasswordReset);
router.post('/resetPassword', user.finishPasswordReset);

router.get('/resetPasswordRequest', user.startPasswordReset);
router.post('/resetPasswordRequest', user.startPasswordReset);

module.exports = router;
