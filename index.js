/*eslint-env node*/
'use strict';

var util = require('util'),
    Path = require('path');
var chalk = require('chalk');

var prettyJSON = function (obj) {
    return JSON.stringify(obj, null, 4);
};

var disableLogging = false;

var getLine = function () {
    var errStr = '';
    try {
        throw new Error('dummy error');
    } catch (e) {
        errStr = e.stack.toString();
        errStr = errStr.split('note-down')[3];

        errStr = errStr.substr(errStr.indexOf('\n    at ') + 1);
        errStr = errStr.substr(0, errStr.indexOf('\n')).replace('    at ', '');

        if (errStr.indexOf('(') >= 0) {
            errStr = errStr.substr(errStr.indexOf('(') + 1);
            errStr = errStr.substr(0, errStr.indexOf(')'));
        }
    }
    var line = errStr;

    if (global._noteDown_basePath) {
        // TODO: Check if it works fine with Windows paths

        var filePathAndLine = errStr;
        var match = errStr.match(/:/g);
        var extractedPath = filePathAndLine;
        if (match && match.length >= 2) {
            extractedPath = extractedPath.substr(0, extractedPath.lastIndexOf(':'));
            extractedPath = extractedPath.substr(0, extractedPath.lastIndexOf(':'));
        }

        var relativePath = Path.relative(global._noteDown_basePath, extractedPath);

        line = relativePath + filePathAndLine.replace(extractedPath, '');
    }
    return line;
};

var log = function (msg) {
    if (global._noteDown_showLogLine) {
        console.log(msg + ' @ ' + chalk.gray.dim(getLine()));
    } else if (disableLogging) {
        // do nothing
    } else {
        console.log(msg);
    }
};

var fnMap = {
    data: [chalk.magenta, function (msg) {
        return util.inspect(msg, {
            showHidden: false,
            depth: null,
            colors: true
        });
    }],
    debug: chalk.blue,
    error: chalk.red,
    errorHeading: chalk.white.bgRed,
    fatal: chalk.white.bgRed,
    help: chalk.black.bgWhite,
    info: chalk.cyan,
    json: [chalk.magenta, function (msg) {
        return util.inspect(msg, {
            showHidden: false,
            depth: null,
            colors: true
        });
    }],
    log: null,
    success: chalk.green,
    trace: chalk.yellow,
    todo: chalk.yellow,
    fixme: chalk.yellow,
    verbose: [chalk.dim, function (msg) {
        if (typeof msg !== 'string') {
            msg = util.inspect(msg, {
                showHidden: false,
                depth: null
            });
        }
        return msg;
    }],
    warn: chalk.yellow,
    warnHeading: chalk.black.bgYellow
};

var noteDown = {};
Object.keys(fnMap).forEach(function (key) {
    if (fnMap[key] === null) {
        noteDown[key] = function (msg) { log(msg); };
    } else if (typeof fnMap[key] === 'function') {
        noteDown[key] = function (msg) { log(fnMap[key](msg)); };
    } else if (Array.isArray(fnMap[key])) {
        noteDown[key] = function (msg) { log(fnMap[key][0](fnMap[key][1](msg))); };
    } else {
        console.log(chalk.white.bgRed('Error: Unexpected error occurred in setting up note-down for functionality "' + key + '"'));
        process.exit(1);
    }
});

noteDown.off = noteDown.disable = function () {
    disableLogging = true;
};
noteDown.on = noteDown.enable = function () {
    disableLogging = false;
};

module.exports = noteDown;
