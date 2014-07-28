/*
 * grunt-veronica
 * https://github.com/gochant/grunt-veronica
 *
 * Copyright (c) 2014 channing
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('veronica', 'build veronica project', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            reqConfig: '',
            modules: [],
            optimize: "none",
            cssPack: "" // all, module, none
        });

        var _ = require('underscore');
        var path = require('path');
        var reqConf = options.reqConfig;

        var appBasePath = path.join(reqConf.appDir, reqConf.baseUrl);
        var widgetsRefPath = {};

        // 获取相对于某个基路径的真实路径
        var getRelativePath = function (originBasePath, originPath, basePath) {
            // 实际路径
            var truePath = path.join(originBasePath, originPath);
            var dep = 10;  // 设定最多向上查找10次

            // 如果基路径不在应用程序路径中，则附加应用程序路径
            if (path.join(basePath, originPath).indexOf(path.join(reqConf.appDir)) < 0) {
                originPath = path.join(appBasePath, originPath);
            }
            // originPath = truePath;
            while (truePath !== path.join(basePath, originPath) && dep !== 0) {
                originPath = path.join('../', originPath);
                dep--;
            }
            return originPath;
        }

        // 获取某个部件源目录下的所有部件，并为每个部件生成 RequireJS 的模块配置
        // 参数：（所有源路径）
        function getWidgetsModules(sources) {

            return _.map(sources, function (source) { // source: { origin, target }
                var fs = require('fs');
                var origin = source.origin;

                if (!source || !fs.existsSync(source.origin)) {
                    return false;
                }

                var subSource = [];  // 不是部件文件夹

                // 找到所有文件夹名称
                var dirs = fs.readdirSync(origin);

                _.each(dirs, function (dir) {
                    if (_.indexOf(fs.readdirSync(origin + '/' + dir), 'main.js') < 0) {
                        subSource.push(dir);
                    }
                });

                var result = _.map(_.reject(dirs, function (dir) {
                    // 排除特殊的文件（夹）名称和其他源路径名称
                    return _.find(['.css', '.js', '.DS_Store', 'styles'].concat(subSource), function (tag) {
                        return dir.indexOf(tag) > -1;
                    });
                }), function (dir) {

                    widgetsRefPath[dir] = 'empty:';
                    _.each(['main', 'styles', 'views', 'templates'], function (name) {
                        var m = dir + '/' + name;
                        widgetsRefPath[m] = m;
                    });

                    return {
                        name: dir + '/main',
                        // name: getRelativePath('./', source.origin, basePath) + '/' + dir + '/main',
                        exclude: ['text', 'css']
                    };
                });
                return result;
            });
        };


        // Iterate over all specified file groups.
        this.files.forEach(function (f) {
            // Concat specified files.
            var src = f.src.filter(function (filepath) {
                // Warn on and remove invalid source files (if nonull was set).
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function (filepath) {
                // Read file source.
                return grunt.file.read(filepath);
            }).join(grunt.util.normalizelf(options.separator));

            // Handle options.
            src += options.punctuation;

            // Write the destination file.
            grunt.file.write(f.dest, src);

            // Print a success message.
            grunt.log.writeln('File "' + f.dest + '" created.');
        });
    });

};
