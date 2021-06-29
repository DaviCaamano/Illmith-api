require('dotenv').config();
const express = require('express');
const app = express();
app.disable('etag');

const path = require('path');
const  createError = require('http-errors');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const log = require('./utils/colors');
const bodyParser = require('body-parser');
const cors = require('cors')

// middleware
app.options('*', cors({ optionsSuccessStatus: 200 }))
app.use(cors({
  optionsSuccessStatus: 200,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials :  true,
  origin: true
}))
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(logger('dev'));
app.use(cookieParser());

//routers
const indexRouter = require('./routes/');
const testRouter = require('./routes/test');

//controllers  /** DELETE ME *************************************************/
const db = require('./utils/database');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

//Routes
app.use('/api', indexRouter);
app.use('/api/test', testRouter);
app.use('/api/public', express.static(path.join(__dirname, './public')));
app.use('/api/article/display', express.static(path.join(__dirname, './public/img/article/display/')));
app.use('/api/article/thumbnail', express.static(path.join(__dirname, './public/img/article/thumbnail/')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



db.getEnvVars().then((envVars) => {

  app.listen(process.env.PORT, () =>{

    log.light('The magic happens on port ' + process.env.PORT + '. ' + new Date().toString());
  });
}).catch(console.log);

