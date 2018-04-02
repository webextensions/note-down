/* globals describe, it */

var assert = require('assert');

var sinon = require('sinon'),
    chalk = require('chalk');

var noteDown = require('../index.js');      // eslint-disable-line no-unused-vars

var logger = noteDown;
logger.option('basePath', __dirname);

describe('Application', function() {
    describe('note-down', function() {
        var positionConsoleOutput = function (aboutToLogToConsole) {
            if (aboutToLogToConsole) {
                process.stdout.write('\n        ');
            } else {
                process.stdout.write('\n');
            }
        };

        var spyConsole = function (initialize, complete) {
            var spy = sinon.spy(console, 'log');
            initialize(spy);
            console.log.restore();
            complete();
        };

        it('should be able to load using require', function(done) {
            // If there would be an error in require, the code would not reach this point
            done();
        });

        it('should be able to generate a simple log', function(done) {
            positionConsoleOutput(true);
            logger.log('Log - This is a simple log');
            done();
        });

        it('should be able to generate an info log', function(done) {
            positionConsoleOutput(true);
            logger.info('Log - This is an info log');
            done();
        });

        it('should be able to generate an errorHeading log', function(done) {
            positionConsoleOutput(true);
            logger.errorHeading('Log - This is an errorHeading log');
            done();
        });

        it('should not generate output when disabled', function(done) {
            positionConsoleOutput(false);
            logger.disable();
            sinon.spy(console, 'log');
            logger.log('Log - This should never be seen on the screen');
            assert(!console.log.calledOnce);
            console.log.restore();
            done();
        });

        it('should not generate output when enabled', function(done) {
            positionConsoleOutput(true);
            logger.enable();
            sinon.spy(console, 'log');
            logger.log('Log - Logging was just enabled');
            assert(console.log.calledOnce);
            console.log.restore();
            done();
        });

        it('should not show the code line of the log', function(done) {
            positionConsoleOutput(true);

            spyConsole(function (spy) {
                logger.option('showLogLine', false);
                var str = 'Log - This log should not be followed by the code-line details';
                logger.log(str);
                assert.equal(spy.args[0][0], str);
            }, function () {
                done();
            });
        });

        it('should show the code line of the log', function(done) {
            positionConsoleOutput(true);

            spyConsole(function (spy) {
                logger.option('showLogLine', true);
                var str = 'Log - This log should be followed by the code-line details (with relative file path)';

                // Note: This piece of code is sensitive to its placement (line number in code)
                logger.log(str);

                try {
                    // Using ".deepEqual()" to print the complete error message
                    // It seems to be not match correctly when executed using "np" (https://www.npmjs.com/package/np)
                    assert.deepEqual({value: spy.args[0][0]}, {value: str + '\u001b[90m\u001b[2m @ test.js:94:24\u001b[22m\u001b[39m'});
                } catch (e) {
                    console.log(chalk.red('You should never see this message on screen under normal run (It is OK, if you see this message when running through a tool like npm global package "np").'));
                    assert.deepEqual({value: spy.args[0][0]}, {value: str + ' @ test.js:94:24'});
                }
            }, function () {
                done();
            });
        });

        it('should show the code line of the log (with full file path)', function(done) {
            positionConsoleOutput(true);

            spyConsole(function (spy) {
                logger.removeOption('basePath');
                var str = 'Log - This log should be followed by the code-line details (with full file path)';

                // Note: This piece of code is sensitive to its placement (line number in code)
                logger.log(str);

                try {
                    // Using ".deepEqual()" to print the complete error message
                    // It seems to be not match correctly when executed using "np" (https://www.npmjs.com/package/np)
                    assert.deepEqual({value: spy.args[0][0]}, {value: str + '\u001b[90m\u001b[2m @ ' + __filename + ':117:24\u001b[22m\u001b[39m'});
                } catch (e) {
                    console.log(chalk.red('You should never see this message on screen under normal run (It is OK, if you see this message when running through a tool like npm global package "np").'));
                    assert.deepEqual({value: spy.args[0][0]}, {value: str + ' @ ' + __filename + ':117:24'});
                }
            }, function () {
                done();
            });
        });

        it('should be able to export the chalk object', function (done) {
            positionConsoleOutput(true);
            logger.log(logger.chalk.red('Red') + ' - ' + logger.chalk.blue('Blue') + ' (colored via chalk)');
            done();
        });

        it('should be able to get and set an option value', function(done) {
            positionConsoleOutput(false);
            logger.option('showLogLine', true);
            assert.equal(logger.option('showLogLine'), true);
            logger.option('showLogLine', false);
            assert.equal(logger.option('showLogLine'), false);
            done();
        });

        it('should be able to work with global option value', function(done) {
            positionConsoleOutput(false);

            spyConsole(function () {
                logger.removeOption('disabled');
                logger.removeOption('disabled', true);
                logger.option('disabled', true, true);
                logger.log('Log - This should never be seen on the screen');
                assert(!console.log.calledOnce);
            }, function () {
                done();
            });
        });
    });
});
