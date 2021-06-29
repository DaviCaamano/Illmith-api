const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const thumbnailUri = '../public/img/article/thumbnail/';
const maxWidth = 1000;
const maxHeight = 500;
const resizeMiddleware = async (req, res, next, uri) => {
    try{

        if (!req.files) return next();

        req.body.images = [];
        await Promise.all(
            req.files.map(async file => new Promise((resolve) => {

                const filePath = path.join(__dirname, uri, file.originalname.toLowerCase());
                const image = sharp(filePath);
                image
                .resize(maxWidth, maxHeight, {fit: 'inside'})
                .toBuffer((err, buffer) => {

                    fs.writeFile(filePath, buffer, (e) => {

                        if(e) console.log(e);
                        else {

                            req.body.images.push(filePath);
                            resolve();
                        }
                    });
                });
            }))
        );
        next();
    }
    catch(e){

        console.log(e);
    }

};

module.exports = { thumbnailResize: (req, res, next) => resizeMiddleware(req, res, next, thumbnailUri) };