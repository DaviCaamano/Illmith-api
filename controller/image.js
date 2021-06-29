const path = require('path');
const fs = require('fs');
const db = require('../utils/database')
const { codes } = require('../utils/codes');
const log = (...args) => console.log(...args);

class Image {

    getImages = (req, res) => {

        try{

            //Outputs
            const fileNames = { display: [], thumbnail: [] };
            const urls = { display: [], thumbnail: [] };
            const files = { display: [], thumbnail: [] };

            const displayDir = path.join(__dirname, '../public/img/article/display/');
            const thumbnailDir = path.join(__dirname, '../public/img/article/thumbnail/');
            const displayFileRead = new Promise((resolve) =>
                fs.readdir(displayDir, (err, readFiles) => {

                    if(err) throw new Error(err);
                    else(resolve(readFiles))
                })
            );
            const thumbnailFileRead = new Promise((resolve) =>
                fs.readdir(thumbnailDir, (err, readFiles) => {

                    if(err) throw new Error(err);
                    else(resolve(readFiles))
                })
            );

            Promise.all([displayFileRead, thumbnailFileRead]).then((readFiles) => {

                const [displays, thumbnails] = readFiles;

                displays.forEach((name) => {

                    const url = '/api/article/display/' + name;
                    fileNames.display.push(name)
                    urls.display.push(url)
                    files.display.push({ name, url })
                });

                thumbnails.forEach((name) => {

                    const url = '/api/article/thumbnail/' + name;
                    fileNames.thumbnail.push(name)
                    urls.thumbnail.push(url)
                    files.thumbnail.push({ name, url })
                });

                res.send({
                    success: true,
                    files,
                    fileNames,
                    urls
                });
            })

        }catch(e){

            e.location = "Error in images.getImages().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    uploadImage = (req, res) => { res.send({ success: true }); }

    getThumbnail = (req, res) => {

        try{

            const fileNames = [];
            const urls = [];
            const dir = path.join(__dirname, '../public/img/article/thumbnail/');
            fs.readdirSync(dir).forEach((name) => {

                fileNames.push(name)
                urls.push('/article/thumbnail/' + name)
            })

            res.send({
                success: true,
                fileNames,
                urls
            });
        } catch(e){

            e.location = "Error in images.getThumbnail().";
            log(e);
            res.status(500).send({ success: false });
        }
    }

    uploadThumbnail = (req, res) => { res.send({ success: true }); }

    edit = (req, res) => {

        try{

            const body = req.method === 'GET'? req.query: req.body;
            const sourceFileType = body.source.split('.').pop().toLowerCase().trim();
            const targetFileType = body.target.split('.').pop().toLowerCase().trim();

            if(sourceFileType !== targetFileType)
                return res.status(400).send({success: false, error: codes.Error.Image.cannotChangeType})

            console.log('body')
            console.log(body)
            const source = filePathInfo(body.source);
            const target = filePathInfo(body.target);

            db.conn.getConnection(async (err, conn) => {

                const rollback = (error) => {

                    conn.rollback();
                    res.status(500).send({ success: false, error: codes.Error.Image.fileRenameFailed});
                    reportError(error, null, 'image.editNewPath()')
                }
                conn.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
                await conn.promise().beginTransaction();

                console.log('target')
                console.log(target)
                console.log('source')
                console.log(source)
                let renameArticleThumbnailsPrm = db.query(`
                    UPDATE articles
                    SET path = ?
                    WHERE path = ?`,
                    [target.filename, source.filename],
                    conn,
                    true
                );

                let fileRenamePrm = new Promise((resolve, reject) => {

                    fs.rename(
                        source.filePath,
                        target.filePath,
                        (err) => {

                            if ( err ) return reject()
                            resolve(true)
                        }
                    );
                })
                Promise.all([renameArticleThumbnailsPrm, fileRenamePrm])
                .then(async () => {

                    console.log('!!!!!!!!!!!!!!!!!!!!!!')
                    await conn.promise().commit();
                    res.send({ success: true });
                })
                .catch(() => rollback())
            })


        } catch(e){

            e.location = "Error in images.edit().";
            log(e);
            res.status(500).send({ success: false })
        }
    }

    delete = (req, res) => {


        const body = req.body;

        console.log('body')
        console.log(body)
        try {

            let {filePath, imageType, filename} = filePathInfo(body.target);

            let thumbnailInUsePrm = imageType === 'thumbnail'
            ?   db.query(`SELECT id FROM articles WHERE thumbnail = ? LIMIT 1;`, [filename], true)
            :   false;

            let fileExistPrm = new Promise((resolve) =>
                fs.access(filePath, fs.F_OK,
                    (err) => {

                        console.log('err')
                        console.log(err)
                        console.log('filePath')
                        console.log(filePath)
                        if (err) resolve(false);
                        else resolve(true);
                }));

            Promise.all([thumbnailInUsePrm, fileExistPrm]).then(([thumbnailInUse, fileExists]) => {

                if(!fileExists)
                    return res.status(409).send({ success: false, error: codes.Error.Image.imageDoesNotExist});
                if(thumbnailInUse.length > 0)
                    return res.status(400).send({ success: false, error: codes.Error.Image.cannotDeleteUsedThumbnail});

                console.log('filePathInfo(body.target).filePath')
                console.log(filePathInfo(body.target).filePath)
                fs.unlinkSync(filePathInfo(body.target).filePath)
                res.send({ success: true });
            }
        );
        } catch(e) {

            e.location = "Error in images.delete().";
            log(e);
            res.status(500).send({success: false, code: codes.Generic.code, message: codes.Generic.message})
        }
    }
}



const DISPLAY_PATH = {
    filePath: path.join(__dirname, '../public/img/article/display/'),
    url: '/api/article/display'
}
const THUMBNAIL_PATH = {
    filePath: path.join(__dirname, '../public/img/article/thumbnail/'),
    url: '/api/article/thumbnail'
}

const filePathInfo = (target) => {

    try{

        let targetUrl = target.split('/');
        const targetFileName = targetUrl.pop();
        targetUrl = targetUrl.join('/');

        let targetFilePath = null,
            imageType = null,
            filename = null;
        if(DISPLAY_PATH.url === targetUrl){

            targetFilePath = DISPLAY_PATH.filePath;
            imageType = 'image';
            filename = targetFileName
        } else if(THUMBNAIL_PATH.url === targetUrl){

            targetFilePath = THUMBNAIL_PATH.filePath;
            imageType = 'thumbnail';
            filename = targetFileName
        }

        return { filePath: targetFilePath + targetFileName, imageType, filename }
    } catch(e){

        e.location = "Error in images.filePathInfo().";
        log(e);
    }
}

const reportError = (e, res, location, code) => {

    let error = e || {}
    error.location = location;
    log(error);
    if(res) res.status(500).send(code? { success: false }: { success: false, error: code })
}


module.exports = new Image();