/*eslint-env node*/
'use strict';

var util = require('util'),
    Path = require('path');

var chalk = require('chalk');

var noteDown = {};

var getLine = function () {
    var errStr = '';
    try {
        throw new Error('dummy error');
    } catch (e) {
        errStr = e.stack.toString();

        errStr = errStr.split('note-down');
        errStr.shift();     // TODO: This can be optimized. Currently using ".shift()". When optimizing, ensure that this works correctly for test cases.
        errStr.shift();
        errStr.shift();
        errStr = errStr.join('note-down');

        errStr = errStr.substr(errStr.indexOf('\n    at ') + 1);
        errStr = errStr.substr(0, errStr.indexOf('\n')).replace('    at ', '');

        if (errStr.indexOf('(') >= 0) {
            errStr = errStr.substr(errStr.indexOf('(') + 1);
            errStr = errStr.substr(0, errStr.indexOf(')'));
        }
    }
    var line = errStr;


    if (noteDown.getComputedOption('basePath')) {
        // TODO: Check if it works fine with Windows paths

        var filePathAndLine = errStr;
        var match = errStr.match(/:/g);
        var extractedPath = filePathAndLine;
        if (match && match.length >= 2) {
            extractedPath = extractedPath.substr(0, extractedPath.lastIndexOf(':'));
            extractedPath = extractedPath.substr(0, extractedPath.lastIndexOf(':'));
        }

        var relativePath = Path.relative(noteDown.getComputedOption('basePath'), extractedPath);

        line = relativePath + filePathAndLine.replace(extractedPath, '');
    }
    return line;
};

var log = function (msg) {
    if (noteDown.getComputedOption('disabled')) {
        // do nothing (because logging is disabled)
    } else {
        if (noteDown.getComputedOption('showLogLine')) {
            console.log(msg + chalk.gray.dim(' @ ' + getLine()));
        } else {
            console.log(msg);
        }
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
    fixme: chalk.yellow,
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
    todo: chalk.yellow,
    trace: chalk.yellow,
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

var globalPrefix = '_noteDown_';

// Get/Set an option
noteDown.option = function (name, value, globalSetting) {
    if (value === undefined) {
        if (globalSetting) {
            return global[globalPrefix + name];
        } else {
            return options[name];
        }
    } else {
        if (globalSetting) {
            global[globalPrefix + name] = value;
        } else {
            options[name] = value;
        }
        return noteDown;
    }
};

// Remove an option
noteDown.removeOption = function (name, globalSetting) {
    if (globalSetting) {
        delete global[globalPrefix + name];
    } else {
        delete options[name];
    }
};

// Get the computed value for the option (value set for the option and fallback to the global value)
noteDown.getComputedOption = function (name) { return noteDown.option(name) || noteDown.option(name, undefined, true); };

noteDown.off = noteDown.disable = function () { noteDown.option('disabled', true);  };
noteDown.on  = noteDown.enable  = function () { noteDown.option('disabled', false); };

noteDown.chalk = chalk;

// Options object
var options = {
    disabled: noteDown.option('disabled', undefined, true) || undefined,
    basePath: noteDown.option('basePath', undefined, true) || undefined,
    showLogLine: noteDown.option('showLogLine', undefined, true) || true
};


module.exports = noteDown;
