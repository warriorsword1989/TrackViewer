import NewSqlite from './../../sqliteConnect.js';
import ResJson from '../../utils/ResJson';
import FilePathResolve from '../../utils/FilePathResolve';
var logger = require('../../../log4js').logger;

class Business {

    constructor(req, res) {
        this.res = res;
        let parm = JSON.parse(req.query.parameter);
        this.dirIndex = parm.dirIndex;
        this.db = new NewSqlite(this.dirIndex).newConnect();
        this.closeDb = function() {
            this.db.close();
        }
    }

    /**
     * 根据轨迹信息列表的额索引查询单个轨迹线以及对应的照片
     */
    getPhotosByIndex(mode) {
        let self = this;
        var resJson = new ResJson();
        let trackTable = '';
        let photoTable = '';

        if (mode === 'videomode') {
            trackTable = 'track_collection';
            photoTable = 'track_collection_photo';
        } else if (mode === 'photomode') {
            trackTable = 'track_contshoot';
            photoTable = 'track_contshoot_photo';
        } else {
            resJson.errmsg = 'mode参数有误！';
            resJson.errcode = -1;
            self.res.json(resJson);
        }

        let sql = `select a.id, AsGeoJSON(a.geometry) AS geometry, b.url,  b.shootTime
            from  ${trackTable} a , ${photoTable} b where a.id = b.id order by a.recordTime `;
        this.db.spatialite(function(err) {
            self.db.all(sql, function(err, rows) {
                if (!err) {
                    var fileObjs = new FilePathResolve().getSourceArr();
                    var fileObj = fileObjs[self.dirIndex];
                    var data = {
                        node: rows,
                        baesPath: fileObj.baseDir,
                        flag: fileObj.flag,
                        dirIndex: self.dirIndex
                    }
                    resJson.data = data;
                } else {
                    resJson.errmsg = err.message;
                    resJson.errcode = -1;
                }
                self.res.json(resJson);
            });
        });
        self.closeDb();
    }

    getNodeDeatil(id, mode) {
        let trackTable = '';
        let photoTable = '';
        let resJson = new ResJson();
        let self = this;
        if (mode === 'videomode') {
            trackTable = 'track_collection';
            photoTable = 'track_collection_photo';
        } else if (mode === 'photomode') {
            trackTable = 'track_contshoot';
            photoTable = 'track_contshoot_photo';
        } else {
            resJson.errmsg = 'mode参数有误！';
            resJson.errcode = -1;
            self.res.json(resJson);

            // -------此处需要改善
        }

        let innerSql = `select aa.recordTime from ${trackTable} aa , ${photoTable} bb where aa.id = bb.id and aa.id = '${id}' `;

        let wholeSql = `select id, recordTime, geometry, '' as url from (select a.id,  a.recordTime, AsWKT(a.geometry) geometry from ${trackTable} a , ${photoTable} b where a.id = b.id and a.recordTime < ( ${innerSql} ) order by a.recordTime desc limit 1 ) temp1  
                    union all
                        select id, recordTime, geometry, url as url from (select a.id, a.recordTime, AsWKT(a.geometry) geometry, b.url from ${trackTable} a , ${photoTable} b where a.id = b.id and a.id = '${id}') temp            
                    union all
                        select id, recordTime, geometry, '' as url from (select a.id,  a.recordTime, AsWKT(a.geometry) geometry from ${trackTable} a , ${photoTable} b where a.id = b.id and a.recordTime > ( ${innerSql} ) order by a.recordTime limit 1) tmep2
        `;

        this.db.spatialite(function(err) {
            self.db.all(wholeSql, function(err, rows) {
                if (!err) {

                    resJson.data = rows;
                } else {
                    logger.error(err);
                    resJson.errmsg = err.message;
                    resJson.errcode = -1;
                }
                self.res.json(resJson);
            });
        });

    }
}

export default Business;