const db = require('../utils/database')
const path = require('path');
const fs = require('fs');
const { codes } = require('../utils/codes');
const log = (...args) => console.log(...args);

const ROOT_ARTICLE_ID = 1;
class Article {

    getArticle = (req, res) => {

        try{

            const body = req.query;

            if(!body.path) return res.status(400).send({ success: false, error: codes.Error.Article.pathMissing });
            console.log('path')
            console.log(body.path)
            db.query(
                `
                        SELECT id, path, title, thumbnail, content, parent_id as parentId
                        FROM articles
                        WHERE path = ?
                        AND id != 1
                        LIMIT 1;`,
                [body.path],
                true
            ).then(articleRecs => {

                if(!articleRecs || articleRecs.length === 0){

                    return res.status(404).send({ success: false, title: '404 NOT FOUND', content: '__title' });
                }

                let {id, title, thumbnail, content, parentId} = articleRecs[0];

                const parentIsRoot = parentId === ROOT_ARTICLE_ID;
                db.query(`
                    SELECT id, path, title, thumbnail, content
                    FROM articles
                    WHERE ${!parentIsRoot? 'id = ? OR ': ''}parent_id = ?`,
                    !parentIsRoot? [parentId, id]: [id],
                    true
                ).then((relationsRecs) => {


                    let parent;
                    const children = [];
                    for(let rec of relationsRecs)
                        if (!parentIsRoot && parseInt(rec.id) === parentId) parent = rec;
                        else children.push(rec);

                    if(parentIsRoot) parent = { isRoot: true }
                    res.send({ success: true, title, path: body.path, thumbnail, content, parent, children })
                })

            }).catch((err) => reportError(err, res, 'articles.getArticlesData()'));
        } catch(e){ reportError(e, res, 'articles.getArticlesData()')  }
    }

    getArticleTree = (req, res) => {

        try{

            db.query(
                `
                        SELECT path, title, thumbnail
                        FROM articles
                        WHERE id != ?;`,
                        [ROOT_ARTICLE_ID],
                true
            ).then(articleRecs => {

                //return each string as an array of sections of the path minus root.
                const paths = articleRecs.map((rec) =>  rec.path);
                const articles = {};
                articleRecs
                    .forEach((rec) => rec.path.split('/')
                        .reduce((o, k) => o[k] = o[k] || { title: rec.title, thumbnail: rec.thumbnail, },
                            articles));

                res.send({ success: true, articles, paths })

            }).catch((err) => {

                console.log('err')
                console.log(err)
            });
        } catch(e){ reportError(e, res, 'articles.getArticlesData()')  }
    }

    getArticleTreeIndex(req, res){

        try{

            db.query('SELECT path FROM articles WHERE id != ?;', [ROOT_ARTICLE_ID], true)
            .then(articleRecs => {

                //return each string as an array of sections of the path minus root.
                const paths = articleRecs.map((rec) =>  rec.path);
                const pathTree = {};
                paths.forEach(p => p.split('/').reduce((o, k) => o[k] = o[k] || {}, pathTree));
                res.send({ pathTree, paths })

            }).catch((err) => {

                log('err')
                log(err)
            })
        } catch(e){ reportError(e, res, 'articles.getCategories()')  }
    }

    create = async (req, res) => {

        try{

            const body = req.body;

            const errors = codes.Error.Article
            if(!body.path) return res.status(400).send({success: false, error: errors.pathMissing});
            if(!body.content) return res.status(400).send({success: false, error: errors.contentFieldEmpty});
            if(!body.thumbnail) return res.status(400).send({success: false, error: errors.noThumbnailSelected});
            if(!body.title) return res.status(400).send({success: false, error: errors.titleFieldEmpty});



            getParentIdForPath(body.path).then((parentId) => {

                if(typeof parentId === 'undefined')
                    return res.status(400).send({success: false, error: errors.mustHaveParent})

                let filePrm = new Promise((resolve) => {

                    fs.access(
                        path.join(__dirname, '../public/img/article/thumbnail/', body.thumbnail),
                        fs.F_OK,
                        (err) => {
                            if (err) resolve(false)
                            resolve(true)
                        }
                    );
                })

                const insertPrm = db.insertIgnore('articles', {
                    path: body.path,
                    content: body.content,
                    thumbnail: body.thumbnail,
                    title: body.title,
                    parent_id: parentId
                })
                Promise.allSettled([filePrm, insertPrm])
                    .then(([thumbnailExists, insertResp]) => {

                        if(insertResp.value.data.affectedRows === 0)
                            return res.status(409).send({ success: false, error: errors.pathAlreadyExists});

                        if(!thumbnailExists.value)
                            return res.status(409).send({success: false, error: errors.thumbnailDoesNotExist});

                        res.send({success: true, articlePath: body.path});
                    }).catch((e) => reportError(e, res, 'articles.create()'));
            }).catch((e) => reportError(e, res, 'articles.create()'));
        } catch(e){ reportError(e, res, 'articles.create()') }
    }

    edit = (req, res) => {

        try{

            const body = req.body;
            const errors = codes.Error.Article

            if(!body.path) res.status(400).send({success: false, error: errors.pathMissing})

            const setNewPath = body.newPath && body.path !== body.newPath;
            let articlePath = body.path;
            let newPath = setNewPath? body.newPath.toLowerCase(): undefined;

            let originalArticlePrm = db.query(`
                SELECT id
                FROM articles 
                WHERE path = ?
                LIMIT 1;`,
                [articlePath],
                true
            );

            let existingArticlesWithPathPrm = setNewPath
                ?   db.query(`
                        SELECT id
                        FROM articles 
                        WHERE path = ?
                        LIMIT 1;
                        `,
                        [newPath],
                        true
                    )
                : false

            const parentPrm = getParentIdForPath(setNewPath? newPath: articlePath)

            let filePrm = body.thumbnail
                ?   new Promise((resolve) => {

                    fs.access(
                        path.join(__dirname, '../public/img/article/thumbnail/', body.thumbnail),
                        fs.F_OK,
                        (err) => {
                            if (err) resolve(false)
                            resolve(true)
                        }
                    );
                })
                :   null

            Promise.allSettled([originalArticlePrm, existingArticlesWithPathPrm, parentPrm, filePrm])
            .then(([articleRec, existingArticlesWithPath, parentIdRec, thumbnailExists]) => {

                if(typeof parentIdRec.value === 'undefined')
                    return res.status(409).send({success: false, error: errors.mustHaveParent})

                const   parentId = parentIdRec.value,
                        articleId = articleRec.value[0].id,
                        newPathAlreadyUsed = existingArticlesWithPath.value && existingArticlesWithPath.value.length > 0

                if(!articleId)
                    return res.status(409).send({success: false, error: errors.articleNotFound});

                if(!thumbnailExists.value)
                    return res.status(409).send({success: false, error: errors.thumbnailDoesNotExist});

                if(newPathAlreadyUsed)
                    return res.status(400).send({success: false, error: errors.pathUsedByOtherArticle});

                if(articleId && thumbnailExists.value && !newPathAlreadyUsed){

                    const updateArticle = (conn) => {
                        return new Promise((resolve, reject) => {

                        const query = `
                        UPDATE articles
                        SET path = ?,
                        parent_id = ?${
                                    !body.title?'':`,
                        title = ?`
                                }${
                                    !body.thumbnail?'':`,
                        thumbnail = ?`
                                }${
                                    !body.content?'':`,
                        content = ?`
                                }
                        WHERE id = ?;`,
                                fields = [setNewPath?newPath :articlePath, parentId];
                            if(body.title) fields.push(body.title);
                            if(body.thumbnail) fields.push(body.thumbnail);
                            if(body.content) fields.push(body.content);
                            fields.push(articleId);
                            db.query(query, fields, conn).then( async (updateRecs) => {


                                if(updateRecs.success){

                                    await conn.promise().commit();
                                    if(updateRecs.data.changedRows === 0)
                                        return res.send({success: false, error: errors.articleUnchanged });
                                    res.send({ success: true, path: newPath || articlePath })
                                }
                                else conn.rollback();

                            })
                        })
                    }

                    editNewPath(articlePath, setNewPath? newPath: null, updateArticle)
                }
            }).catch((e) => reportError(e, res, 'articles.edit()'))
        } catch(e){ reportError(e, res, 'articles.edit()') }
    }

    delete = (req, res) => {

        try{

            const errors = codes.Error.Article
            const body = req.query;

            if(!body.path) return res.status(400).send({success: false, error: errors.pathMissing});

            const selectArticlePrm = db.query(`
            SELECT id FROM articles WHERE path = ?`, [body.path], true)
            Promise.allSettled([getAncestry(body.path), selectArticlePrm]).then(([children, article]) => {


                const   hasChildren = children.value.length > 0,
                        articleId = article.value[0].id;

                if(hasChildren)
                    return res.status(400).send({success: false, error: errors.cannotDeleteParent});

                if(!articleId)
                    return res.status(409).send({success: false, error: errors.articleNotFound});

                db.query(`
                DELETE FROM articles WHERE id = ?`, [articleId]).then((deleteResp) => {

                    if(deleteResp.data.affectedRows === 0)
                        return res.status(409).send({success: false, error: errors.articleNotFound});

                    res.send({ success: true })
                }).catch(err => reportError(err, res, 'articles.delete()'))
            })
        } catch(e){ reportError(e, res, 'articles.delete()')}
    }
}

parentExists = (path) => {

    try{
        return new Promise((resolve, reject) => {

            if(!path.includes('/'))
                return resolve(true)
            
            db.query(`
                    SELECT id
                    FROM articles
                    WHERE path = ?
                    LIMIT 1;`,
                [path.split('/').slice(0, -1).join('/')],
                true
            )
            .then((parentRec) => resolve(parentRec[0].id))
            .catch(reject)
        });
    } catch(e){ reportError(e, null, 'articles.parentExists()')}
}

getParentIdForPath = (identifier) => {

    try{
        return new Promise((resolve, reject) => {

            const identifierIsNumber = typeof identifier === 'number';
            const identifierField = identifierIsNumber? 'id': 'path'
            const identifierValue = identifierIsNumber? identifier: identifier.split('/').slice(0, -1).join('/')

            if(!identifierIsNumber && !identifier.includes('/'))
                return resolve([1])
            db.query(`
                    SELECT id
                    FROM articles
                    WHERE ${identifierField} = ?
                    LIMIT 1;`,
                [identifierValue],
                true
            )
            .then((parentRec) => resolve(parentRec[0].id))
            .catch(reject)
        });
    } catch(e){ reportError(e, null, 'articles.getParentIdForPath()')}
}


getParentDataFromId = (id, fields = ['id']) => {

    try{
        return new Promise((resolve, reject) => {

            db.query(`
                    SELECT ?
                    FROM articles
                    WHERE id = ?
                    LIMIT 1;`,
                [fields.join(', '), id],
                true
            )
                .then((parentRec) => resolve(parentRec[0]))
                .catch(reject)
        });
    } catch(e){ reportError(e, null, 'articles.getParentIdForPath()')}
}

getAncestry = (path, newPath, conn) => {

    const query = `
        Select id, ${newPath? 'REPLACE(path, ?, ?) as path': 'path'}
        FROM articles
        WHERE path LIKE ?
        AND path != ?;`,
        fields = newPath? [path, newPath, path + '%', path]: [path + '%', path];
    if(conn) return db.query(query, fields, conn, true)
    return db.query(query, fields, true)
}

editNewPath = (path, newPath, callback) => {

    if(!path && newPath)
        return new Error('Error in articles.editNewPath(): New Path set, but no existing Path Set.');

    db.conn.getConnection(async (err, conn) => {

        try{
            conn.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED')
            await conn.promise().beginTransaction();

            if(path && !newPath)
                return callback(conn);

            getAncestry(path, newPath, conn)
            .then((updateRecs) => {

                let query = '';
                const fields = [];
                for(let rec of updateRecs) {
                    query += `
                    UPDATE articles
                    SET path = ?
                    WHERE id = ?;`
                    fields.push.apply(fields, [rec.path, rec.id])
                }

                if(query)
                    db.query(query, fields, conn,true).then(callback(conn))
                else callback(conn);
            });
        } catch(error) {
            conn.rollback();
            reportError(error, null, 'articles.editNewPath()')
        }
    })
}
const reportError = (e, res, location, code) => {

    e.location = location;
    log(e);
    if(res) res.status(500).send(code? { success: false }: { success: false, error: code })
}




module.exports = new Article();