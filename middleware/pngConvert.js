const jimp = require('jimp');


const imageConvert = (width = 256, height = 256) => {

    return (req, res, next) => {

        const fileWithoutExtension = eq.file_path.split('.').slice(0, -1).join('.');
        const fileWithExtension = fileWithoutExtension + '.png';
        jimp.read(req.file_path, (err, img) => {

            if(err) console.log(err);
            else {

            }
            img.resize(width, height)                // resize
                .quality(60)                    // set JPEG quality\
                .write(fileWithExtension);    // save
        })
        .then(() => {

            req.file_path = fileWithExtension
            next();
        })
        .catch(console.log)
    }
}

module.exports = imageConvert
