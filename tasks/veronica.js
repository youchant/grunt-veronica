/*
* grunt-veronica
* https://github.com/gochant/grunt-veronica
*
* Copyright (c) 2014 channing
* Licensed under the MIT license.
*/

'use strict';

module.exports = function (grunt) {

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
            clean: [],
            removeCombined: false,  // @deprecated
            jsPack: {
                common: {
                    target: './widgets'
                },
                paths: [{
                    origin: './widgets'
                }]
            },
            cssPack: {
                mode: "all", // all, module, none
                src: [],
                target: this.data.options.dir + '/styles'
            }
        };

        var options = this.options(defaults);
        var _ = require('underscore');
        var path = require('path');
        var reqConf = options.reqConfig;
        var defaultSubPaths = ['widgets', 'plugins'];

        var helper = require('../lib/helper.js')(options);
        var entryPack = require('../lib/entryPack.js');



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
            copy: { main: {} },
            clean: {
                // TODO: 这里写死了一些路径，需考虑一种更优雅的方式
                main: [
                   options.dir + '/**/*.less',
                   options.dir + '/**/build.txt',
                   options.dir + '/**/__temp__',
                   options.dir + '/**/__tempRelease__'
                ],
                output: [options.dir],
                others: options.clean
            },
            css_combo: {
                main: {
                    files: options.cssPack.combo || { }
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

        grunt.registerTask('site', ['requirejs:site']);

        var jsPack = require('../lib/jspack');

        grunt.registerTask('widgets', function () {
            var mbConfig = jsPack.getPaths(options.jsPack, options);

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
                var allStyleStream = '';
                var cssComboOptions = { files: {} };
                var cssTarget = options.cssPack.target;
                var cssName = '/' + options.cssPack.name;
                var allStyles = [];
                var fs = require('fs');

                _.each(options.cssPack.src, function (p) {
                    var src = path.join(options.dir, options.baseUrl, p);  // 相对于基路径

                    var thisStyles = grunt.file.expand([src + '/**/*.css', '!' + src + '/**/*.min.css']);
                    allStyles.push(thisStyles);
                });

                _.each(allStyles, function (styles, idx) {
                    var stream = '';

                    _.each(styles, function (style) {
                        stream += '@import "' + helper.getRelativePath('./', style, cssTarget) + '";\n';
                    });

                    if (options.cssPack.mode === "all") {
                        allStyleStream += stream;
                    }
                });

                if (allStyleStream !== '') {
                    // fs.writeFileSync(cssTarget + cssName, allStyleStream);
                    // 生成 CSS 合并后文件
                    grunt.file.write(cssTarget + cssName, allStyleStream);

                    if (options.cssPack.mode === 'all') {
                        cssComboOptions.files[cssTarget + cssName] = [cssTarget + cssName];
                    }
                }

                grunt.config('css_combo.all', cssComboOptions);
            });

            grunt.task.run(['css-combine', 'css_combo']);
        });


        grunt.registerTask('default', function () {
            grunt.task.run('clean:output');
            grunt.task.run('site');
            grunt.task.run('widgets');
            grunt.task.run('cssPack');
            grunt.task.run('clean:main');
            grunt.task.run('clean:others');
            if (options.optimize) {
                grunt.task.run('uglify');
                grunt.task.run('cssmin');
            }

        });

        grunt.registerTask('publish', function () {
            var widgetStyles = [];
            _.each(defaultSubPaths, function (p) {
                var src = path.join(options.dir, options.baseUrl, p);
                var thisStyles = grunt.file.expand([src + '/**/*.css', '!' + src + '/**/*.min.css']);
                widgetStyles.push(thisStyles);
            });
        });

        grunt.task.run('default');
    });

};
