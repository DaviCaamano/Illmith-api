const express = require('express');
const router = express.Router({mergeParams: true});
const article = require('../controller/article');
const image = require('../controller/image');
const { imageUpload, thumbnailUpload } = require('../middleware/multer');
const { thumbnailResize } = require('../middleware/sharp');
//Middleware
const {validate, authorize} = require('../middleware/validateUser');

/**
 Base Route:
 /api/articles/
 **/
router.get('/', article.getArticle)

router.get('/tree', authorize, article.getArticleTree)
router.get('/categories', authorize, article.getArticleTreeIndex);

router.post('/', authorize, article.create);
router.patch('/', authorize, article.edit);
router.delete('/', authorize, article.delete);

router.get('/images', authorize, image.getImages);
router.post('/images', authorize, imageUpload, image.uploadImage);
router.patch('/images', authorize, image.edit);
router.delete('/images', authorize, image.delete);

router.get('/thumbnails', authorize, image.getThumbnail);
router.post('/thumbnails', authorize, thumbnailUpload, thumbnailResize, image.uploadThumbnail);
router.patch('/thumbnails', authorize, image.edit);
router.delete('/thumbnails', authorize, image.delete);

module.exports = router;
