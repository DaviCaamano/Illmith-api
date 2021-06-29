const express = require('express');
const router = express.Router({mergeParams: true});
const user = require('../controller/user');
const rateLimit = require('../middleware/rateFilter')
//Middleware
const {validate, authorize} = require('../middleware/validateUser');

/**
  Base Route:
    /api/users/
**/
router.get('/validate', validate, user.validate);
router.get('/authorize', authorize, user.authorize);

router.post('/login', rateLimit, user.login);
router.post('/authorizedLogin', rateLimit, user.authorizedLogin);

router.post('/logout', user.logout);

router.get('/register', rateLimit, user.startRegistration);
router.post('/register', user.finishRegistration);

router.get('/resetPassword', user.startPasswordReset);
router.post('/resetPassword', user.finishPasswordReset);

module.exports = router;
