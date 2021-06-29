const express = require('express');
const router = express.Router({mergeParams: true});
const users = require('./users');
const articles = require('./articles');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.use('/users', users)
router.use('/articles', articles)
module.exports = router;
