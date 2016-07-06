/*
* grunt-veronica
* https://github.com/gochant/grunt-veronica
*
* Copyright (c) 2014 channing
* Licensed under the MIT license.
*/

'use strict';

module.exports = function (grunt) {
    var _ = require('underscore');
    var path = require('path');
    var entryPack = require('../lib/entryPack.js');
    var jsPack = require('../lib/jspack');
    var cssPack = require('../lib/csspack');

    grunt.registerMultiTask('veronica', 'build veronica project', function () {

        var defaults = {
            appDir: '',  // 应用程序根路径
            baseUrl: '',  // 应用程序基路径，即主文件：main.js 所在的相对路径
            dir: '',  // 打包后的应用程序根路径
            reqConfig: '',
            entryPack: [],
            optimize: { paths: [] }, // uglify
            notMerge: [],
            moduleMerge: [],
            clean: {},
            removeCombined: false,  // @deprecated
            jsPack: {},
            cssPack: {},
            remote: {}
        };

        var options = this.options(defaults);
        var globalOptions = options;

        // 系统默认值
        var remoteLocalName = '__local__';
        var pkgSysDefaults = {
            pkgParent: './modules/',
            pkgTarget: './widgets'
        };

        var cssPackSysDefaults = {
            mode: 'all',
            name: 'module.css',
            src: ['./widgets'],
            target: options.dir + '/styles'
        };
        var cleanDefaults = {
            // TODO: 这里写死了一些路径，需考虑一种更优雅的方式
            afterEntryPack: [
                options.dir + '/**/*.less', 
                options.dir + '/**/require-conf.js'
            ],
            afterJsPack: [
                options.dir + '/**/build.txt',
                options.dir + '/**/__temp__',
                options.dir + '/**/__tempUnique__',
                options.dir + '/**/__tempRelease__',
                options.dir + '/widgets/**/*.css',
                options.dir + '/widgets/**/*.html',
                options.dir + '/modules',
            ],
            output: [options.dir],
            custom: [],
            remote: [remoteLocalName]
        };

        grunt.initConfig({
            // 任务配置
            requirejs: {
                // 单个网站
                site: {
                    options: entryPack.getReqOptions(options)
                },
                widget: {}
            },
            concat: {
                options: {
                    separator: '\n'
                }
            },
            copy: {
                main: {},
                remote: options.remote.copy
            },
            clean: _.extend(cleanDefaults, options.clean),
            css_combo: {
                main: {
                    files: options.cssPack.combo || {}
                }
            },
            cssmin: {
                main: {
                    files: [{
                        expand: true,
                        cwd: options.dir,
                        src: ['**/*.css'].concat(options.optimize.paths || []),
                        filter: 'isFile',
                        dest: options.dir
                    }]
                }
            },
            uglify: {
                main: {
                    files: [{
                        expand: true,
                        cwd: options.dir,
                        src: ['**/*.js'].concat(options.optimize.paths || []),
                        filter: 'isFile',
                        dest: options.dir
                    }]
                }
            }
        });

        grunt.loadNpmTasks('grunt-contrib-requirejs');
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-contrib-copy');
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-css-combo');
        grunt.loadNpmTasks('grunt-contrib-uglify');
        grunt.loadNpmTasks('grunt-contrib-cssmin');
        grunt.loadNpmTasks('grunt-curl');
        grunt.loadNpmTasks('grunt-zip');

        grunt.registerTask('site', ['requirejs:site']);

        grunt.registerTask('jsPack', function () {
            var mbConfig = jsPack.getPaths(options.jsPack, options, pkgSysDefaults);

            grunt.registerTask('copyWidgets', function () {
                var wrench = require('wrench');

                mbConfig.forEach(function (config, i) {

                    grunt.config('copy.widgetFirst' + i, {
                        expand: true,
                        cwd: config.origin + '/',
                        src: '**',
                        dest: config.temp
                    });
                    // 将多层文件夹转换成单层唯一名称文件夹，例如：moduleName/xx/home/header --> moduleName-home-header
                    grunt.registerTask('renameWidget' + i, function () {
                        var deleteFolder = [];
                        var absRootPath = path.resolve(config.temp);
                        grunt.file.recurse(absRootPath, function callback(abspath, rootdir, subdir, filename) {
                            if (subdir && jsPack.isInPackage(filename)) {
                                var uniqueFolder = jsPack.createUniqueFolder(subdir, config.name, config.unique);
                                var originFolder = path.join(abspath.replace(filename, ''));
                                var copyToFolder = path.resolve(path.join(config.temp_unique, uniqueFolder));

                                wrench.mkdirSyncRecursive(copyToFolder);
                                wrench.copyDirSyncRecursive(originFolder, copyToFolder, { forceDelete: true });

                                deleteFolder.push(originFolder);

                            }
                        });
                        if (config.name) {
                            deleteFolder.push(absRootPath);
                        }

                        deleteFolder.forEach(function (f) {
                            wrench.rmdirSyncRecursive(f);
                        });
                    });

                    grunt.task.run([
                        'copy:widgetFirst' + i,
                        'renameWidget' + i
                    ]);
                });


            });

            grunt.registerTask('packWidgets', function () {
                // 分别为每个部件源进行打包
                mbConfig.forEach(function (config, i) {
                    var reqOptions = jsPack.getReqOptions(config, options);

                    if (reqOptions.modules === false) return;

                    grunt.config('requirejs.widget' + i, {
                        options: reqOptions
                    });

                    grunt.config('clean.widget' + i, {
                        src: _.map([
                            '/**/templates/',
                            '/**/css.js',
                            '/**/ver.js',
                            '/**/css-builder.js',
                            '/**/normalize.js',
                            '/**/text.js',
                            '/**/main.css'  // 由require-css 生成的错误CSS文件
                        ], function (s) {
                            return config.temp_release + s;
                        })
                    });

                    // 拷贝到最终目录
                    grunt.config('copy.widget' + i, {
                        expand: true,
                        cwd: config.temp_release + '/',
                        src: '**/*',
                        dest: config.target
                        // ,
                        // flatten: true,
                        // filter: 'isFile',
                        //rename: function (dest, src) {
                        //    var name = src;
                        //    if (path.dirname(src) !== '.') {
                        //        name = path.dirname(src) + '.js';
                        //    }
                        //    return path.join(dest, name);
                        //}
                    })

                    // 压缩该目录下所有插件
                    grunt.task.run('requirejs:widget' + i);
                    // 清理
                    grunt.task.run('clean:widget' + i);
                    // 拷贝部件
                    grunt.task.run('copy:widget' + i);

                });

            });

            grunt.task.run(['copyWidgets', 'packWidgets']);

        });

        grunt.registerTask('cssPack', function () {
            grunt.registerTask('css-combine', function () {
                var cssComboOptions = { files: {} };
                var fileNames = cssPack.createFiles(options, cssPackSysDefaults);

                _.each(fileNames, function (fileName) {
                    if (fileName !== '') { // 修复空文件的bug
                        cssComboOptions.files[fileName] = [fileName];
                    }
                });

                grunt.config('css_combo.all', cssComboOptions);

            });

            grunt.task.run(['css-combine', 'css_combo']);
        });

        grunt.registerTask('fetch', function () {
            var i = 0;

            var remoteConfig = _.extend({
                vendor: [],
                modules: [],
                copy: {}
            }, globalOptions.remote);

            remoteConfig.vendor.forEach(function (v) {
                var zipName = remoteLocalName + '/' + v.name;
                grunt.config.set('curl.' + i, {
                    src: v.path + v.name,
                    dest: zipName
                });
                grunt.config.set('unzip.' + i, {
                    src: zipName,
                    dest: remoteLocalName
                });

                i++;
            });
            remoteConfig.modules.forEach(function (v) {
                var zipName = remoteLocalName + '/' + v.name;
                grunt.config.set('curl.' + i, {
                    src: v.path + v.name,
                    dest: zipName
                });
                grunt.config.set('unzip.' + i, {
                    src: zipName,
                    dest: remoteLocalName + '/modules'
                });
                i++;
            });

            grunt.task.run(['clean:remote', 'curl', 'unzip']);
        });

        grunt.registerTask('default', function () {
            var tasks = [
                'clean:output',
                'fetch',
                'site',
                'jsPack',
                'cssPack',
                'copy:remote',
                'clean:afterEntryPack',
                'clean:afterJsPack',
                'clean:custom',
                'clean:remote'
            ];
            if (options.clean.output === false) {
                tasks[0] = false;
            }
            if (options.remote === false) {
                tasks[1] = false;
                tasks[5] = false;
                tasks[9] = false;
            }
            if (options.entryPack === false) {
                tasks[2] = false;
                tasks[6] = false;
            }
            if (options.jsPack === false) {
                tasks[3] = false;
                tasks[7] = false;
            }
            if (options.cssPack === false) {
                tasks[4] = false;
            }

            grunt.task.run(_.compact(tasks));
            if (options.optimize) {
                grunt.task.run(['uglify', 'cssmin']);
            }
        });

        grunt.task.run('default');
    });

};
