const colors = require('chalk');
const log = console.log;


class Log {

    error = (...msg) => {
        for(let i in msg)
            log(colors.white.bgRed(msg[i]));
    };
    warning = (...msg) => {
        for(let i in msg)
            log(colors.bgYellow(msg));
    };
    success = (...msg) => {
        for(let i in msg)
            log(colors.white.bgGreen(msg));
    };
    info = (...msg) => {
        for(let i in msg)
            log(colors.bgBlue(msg));
    };
    light = (...msg) => {
        for(let i in msg)
            log(colors.bgCyanBright(msg));
    };
    danger = (...msg) => {
        for(let i in msg)
            log(colors.keyword('orange')(msg));
    };
    normal = (...msg) => {
        for(let i in msg)
            log(msg[i]);
    };





}
module.exports = new Log();
