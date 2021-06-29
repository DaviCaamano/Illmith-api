const multer  = require('multer');
const sharp = require("sharp");
const fs = require('fs');
const path = require('path');

const { codes } = require('../utils/codes');
const imageUri = '../public/img/article/display/';
const thumbnailUri = '../public/img/article/thumbnail/';

const fileFilter = (req, uri, file, fileName, callback) => {

    if (!file.mimetype.startsWith("image"))
        callback(codes.Error.Image.invalidFileType.code, false);
    if(!req.userAuthorized) callback(null, false);
    if (!req.header('overwrite') && fs.existsSync(path.join(__dirname, uri, fileName))) {
        callback(new Error(codes.Error.Image.fileExists.code), false);
    } else {
        callback(null, true);
    }
}

const errorHandling = (err, req, res, next) => {

    if(err instanceof multer.MulterError) {
        console.log('Multer Error')
        console.log(err)
    }
    else if(err){

        //Image File already exists and overwrite is not approved.
        if(err.message === codes.Error.Image.fileExists.code)
            res.status(200).send({success: false, err: codes.Error.Image.fileExists });
        //Uploaded file is not an image.
        else if(err.message === codes.Error.Image.invalidFileType.code)
            res.status(200).send({success: false, err: codes.Error.Image.invalidFileType });
        else{

            console.log('An unknown Error has occurred while Multer was Running.');
            if(err) console.log(err);
        }
    }
    else {

        next();
    }
}

//Middleware
const limits = {
    fileSize: '30MB',
    fieldNameSize: '300',
    files: 20
}

const imageUpload = multer({
    limits,
    fileFilter: (req, file, cb) => fileFilter(req, imageUri, file, file.originalname, cb),
    storage: multer.diskStorage({
        destination: (req, file, cb) => {

            cb(null, path.join(__dirname, imageUri));
        },
        filename: (req, file, cb) => {

            req.file_path = file.originalname.toLowerCase();
            cb(null, file.fieldname.toLowerCase());
        },
    }),
});

const thumbnailUpload = multer({
    limits,
    fileFilter: (req, file, cb) => fileFilter(req, thumbnailUri, file, file.originalname, cb),
    storage: multer.diskStorage({
        destination: (req, file, cb) => {

            cb(null, path.join(__dirname, thumbnailUri));
        },
        filename: (req, file, cb) => {

            req.file_path = file.originalname.toLowerCase();
            cb(null, file.fieldname.toLowerCase());
        },
    })
});

const imageMiddleWare = (req, res, next) => {

    imageUpload.any()(req, res, (err) => errorHandling(err, req, res, next));
}

const thumbnailMiddleWare = (req, res, next) => {

    thumbnailUpload.any()(req, res, (err) => errorHandling(err, req, res, next));
}

module.exports = {
    imageUpload: imageMiddleWare,
    thumbnailUpload: thumbnailMiddleWare
};

