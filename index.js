/*eslint-env node*/
'use strict';

var util = require('node:util'),
    path = require('node:path');

var chalk = require('chalk');

const createNoteDownInstance = function () {
    var noteDown = {};

    var getLine = function () {
        // TODO: * Check if it works fine with Windows paths

        let callSites = util.getCallSites();

        const ignoreLogsFor = noteDown.getComputedOption('ignoreLogsFor') || [];
        for (const entryToIgnore of ignoreLogsFor) {
            callSites = callSites.filter(function (callSite) {
                if (callSite.scriptName.indexOf(entryToIgnore) >= 0) {
                    return false;
                }
                return true;
            });
        }

        const relevantCallSite = callSites[5];

        let scriptName = relevantCallSite.scriptName;
        scriptName = scriptName.replace(/^file:\/\/\//, '/'); // Seemingly, useful for cases like TypeScript (was last tested before moving to `util.getCallSites()` API)
        if (noteDown.getComputedOption('basePath')) {
            var filePathAndLine = scriptName;
            var match = filePathAndLine.match(/:/g);
            var extractedPath = filePathAndLine;
            if (match && match.length >= 2) {
                extractedPath = extractedPath.substr(0, extractedPath.lastIndexOf(':'));
                extractedPath = extractedPath.substr(0, extractedPath.lastIndexOf(':'));
            }

            var relativePath = path.relative(noteDown.getComputedOption('basePath'), extractedPath);

            scriptName = relativePath + filePathAndLine.replace(extractedPath, '');
        }
        const lineNumber = relevantCallSite.lineNumber;
        const column = relevantCallSite.column;
        const line = scriptName + ':' + lineNumber + ':' + column;

        return line;
    };

    const deviceNameIfAvailableInGray = (function () {
        // $ export NOTE_DOWN_DEVICE_NAME="example.com"
        const deviceName = process.env.NOTE_DOWN_DEVICE_NAME;

        if (deviceName) {
            return chalk.gray.dim('[' + process.env.NOTE_DOWN_DEVICE_NAME + '] ');
        } else {
            return '';
        }
    }());

    var log = function (msg) {
        if (noteDown.getComputedOption('disabled')) {
            // do nothing (because logging is disabled)
        } else {
            if (noteDown.getComputedOption('showLogLine')) {
                console.log(deviceNameIfAvailableInGray + msg + chalk.gray.dim(' @ ' + getLine()));
            } else {
                console.log(deviceNameIfAvailableInGray + msg);
            }
        }
    };

    var idempotent = function (param) {
        return param;
    };

    var logIt = function (passedArguments, processFn) {
        var i;
        for (i = 0; i < passedArguments.length; i++) {
            var passedArgument = passedArguments[i];
            log(processFn(passedArgument));
        }
    };

    // debugCategoryList would be used to decide whether to log the .debug(message, category) calls or not
    var debugCategoryList = {};
    // Examples:
    // {} - All noteDown.debug() messages would be printed
    // { '*': 'enabled' } - All noteDown.debug() messages would be printed
    // { 'TEST': 'disabled' } - All noteDown.debug() messages, except noteDown.debug(<message>, 'TEST') would be printed
    // { '*': 'disabled' } - No noteDown.debug() messages would be printed
    // { '*': 'disabled', 'TEST': 'enabled' } - Only noteDown.debug(<message>, 'TEST') messages would be printed

    /*
        operation: enable/disable/delete/get/getAll
        category: any string
    */
    noteDown.debugCategoryOperation = function (operation, category) {
        if (['enable', 'disable', 'delete', 'get'].indexOf(operation) >= 0) {
            if (category && typeof category === 'string') {
                if (operation === 'enable') {
                    debugCategoryList[category] = 'enabled';
                } else if (operation === 'disable') {
                    debugCategoryList[category] = 'disabled';
                } else if (operation === 'delete') {
                    delete debugCategoryList[category];
                } else if (operation === 'get') {
                    return debugCategoryList[category];
                } else if (operation === 'getAll') {
                    return debugCategoryList;
                } else {
                    console.log('Warning: The code should never reach this line. Please report a bug in this package.');
                }
            } else {
                console.log('Warning: Unexpected category for debugCategoryOperation');
            }
        } else if (operation === 'getAll') {
            return debugCategoryList;
        } else {
            console.log('Warning: Unexpected operation for debugCategoryOperation');
        }

        // Make this function call chainable for the cases where it has not returned some data
        return noteDown;
    };


    var fnMap = {
        error:          function () { logIt(arguments, chalk.red); },
        errorHeading:   function () { logIt(arguments, chalk.white.bgRed); },
        fatal:          function () { logIt(arguments, chalk.white.bgRed); },
        fixme:          function () { logIt(arguments, chalk.yellow); },
        help:           function () { logIt(arguments, chalk.black.bgWhite); },
        info:           function () { logIt(arguments, chalk.cyan); },
        log:            function () { logIt(arguments, idempotent); },
        success:        function () { logIt(arguments, chalk.green); },
        todo:           function () { logIt(arguments, chalk.yellow); },
        trace:          function () { logIt(arguments, chalk.yellow); },
        warn:           function () { logIt(arguments, chalk.yellow); },
        warnHeading:    function () { logIt(arguments, chalk.black.bgYellow); },

        data: function () {
            logIt(arguments, function (msg) {
                return chalk.magenta(util.inspect(msg, {
                    showHidden: false,
                    depth: null,
                    colors: true
                }));
            });
        },
        debug: function (msg, category) {
            var showMessage = true;
            if (debugCategoryList['*'] === 'disabled' || debugCategoryList[category] === 'disabled') {
                showMessage = false;
            }
            if (debugCategoryList[category] === 'enabled') {
                showMessage = true;
            }
            if (showMessage) {
                logIt([category + ': ' + msg], chalk.cyan);
            }
        },
        json: function () {
            logIt(arguments, function (msg) {
                return chalk.magenta(util.inspect(msg, {
                    showHidden: false,
                    depth: null,
                    colors: true
                }));
            });
        },
        verbose: function () {
            logIt(arguments, function (msg) {
                if (typeof msg !== 'string') {
                    msg = util.inspect(msg, {
                        showHidden: false,
                        depth: null
                    });
                }
                return chalk.dim(msg);
            });
        }
    };

    Object.keys(fnMap).forEach(function (key) {
        noteDown[key] = function () {
            fnMap[key].apply(this, arguments);
        };
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
        basePath: noteDown.option('basePath', undefined, true) || process.cwd() || undefined,
        showLogLine: noteDown.option('showLogLine', undefined, true) || true
    };

    return noteDown;
};

const noteDown = createNoteDownInstance();
const logger = noteDown;

module.exports = {
    createNoteDownInstance,
    noteDown,
    logger
};
