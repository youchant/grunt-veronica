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

        var options = this.options({
            appDir: '',
            baseUrl: '',
            dir: '',
            entry: 'main',
            reqConfig: '',
            modules: [],
            optimize: "none", // uglify
            solution: '',
            merge: [],
            notMerge: [],
            moduleMerge: [],
            clean: [],
            buildPaths: {},
            cssPack: "all", // all, module, none
            removeCombined: true,
            cssTarget: this.data.options.dir + '/styles'
        });

        var _ = require('underscore');
        var path = require('path');
        var reqConf = options.reqConfig;
        var defaultSubPaths = ['widgets', 'plugins'];

        // 应用程序基路径
        var appBasePath = path.join(options.appDir, options.baseUrl);
        var appTargetBasePath = path.join(options.dir, options.baseUrl);
        var helper = {
            // 根据模块生成所有的源配置
            getSourcesFromModules: function (modules, reqConf) {
                var sources = [];

                var createSource = function (module, subpath, type) {
                    return {
                        // 原始路径
                        origin: path.join(options.appDir, options.baseUrl, module.source, module.name, subpath),
                        // 打包过程中的目标路径
                        target: path.join(options.dir, options.baseUrl, subpath + '/__temp__', module.name),
                        // 最终放置的路径
                        copy: path.join(options.dir, options.baseUrl, type),
                        // 类型
                        type: type
                    };
                }

                _.each(modules, function (module) {
                    var subpaths = defaultSubPaths;
                    if (module.subpaths) {
                        subpaths = subpaths.concat(module.subpaths);
                    }

                    _.each(subpaths, function (subpath) {
                        var type = _.find(defaultSubPaths, function (p) {
                            return subpath.indexOf(p) >= 0;
                        });

                        sources.push(createSource(module, subpath, type));
                    });
                });

                return sources;
            },
            // 获取相对于某个基路径的真实路径
            getRelativePath: function (originBasePath, originPath, currBasePath) {
                // 实际路径
                var truePath = path.join(originBasePath, originPath);
                var dep = 10;  // 设定最多向上查找10次

                // 如果基路径不在应用程序路径中，则附加应用程序路径
                if (path.join(originBasePath) !== '.\\' && path.join(currBasePath, originPath).indexOf(path.join(originBasePath) + '\\') < 0) {
                    originPath = path.join(appBasePath, originPath);
                }
                while (truePath !== path.join(currBasePath, originPath) && dep !== 0) {
                    originPath = path.join('../', originPath);
                    dep--;
                }
                return originPath;
            },
            // 获取某个部件源目录下的所有部件，并为每个部件生成 RequireJS 的模块配置
            // 参数：（所有源路径）
            getReqModulesAndPathsFromSources: function (sources) {
                var widgetsRefPath = {};
                var modules = _.map(sources, function (source) { // source: { origin, target }
                    var fs = require('fs');
                    var origin = source.origin;

                    if (!source || !fs.existsSync(source.origin)) {
                        return false;
                    }

                    var subSource = [];  // 不是部件文件夹

                    // 找到所有文件夹名称
                    var dirs = fs.readdirSync(origin);
                    _.each(dirs, function (dir) {
                        // 排除不是部件文件夹的目录
                        if (_.indexOf(fs.readdirSync(origin + '/' + dir), 'main.js') < 0) {
                            subSource.push(dir);
                        }
                    });

                    var clearedDirs = _.reject(dirs, function (dir) {
                        // 排除特殊的文件（夹）名称和其他源路径名称
                        return _.find(['.css', '.js', '.DS_Store', 'styles'].concat(subSource), function (tag) {
                            return dir.indexOf(tag) > -1;
                        });
                    });
                    var result = _.map(clearedDirs, function (dir) {

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
                return {
                    modules: modules,  // 部件的 modules 配置
                    paths: widgetsRefPath  // 部件的 path 配置
                }
            },
            // 为每个source生成Req配置
            getSourcesReqConfig: function (sources, modulesConfig, options) {
                var widgetModules = modulesConfig.modules;
                var widgetRefPaths = modulesConfig.paths;
                var reqConf = options.reqConfig;

                return _.map(sources, function (source, index) {

                    var widgetPaths = {};
                    var emptyPaths = {};
                    var widgetPackages = [];
                    var modules = widgetModules[index];

                    // 解析以下几个文件相对于部件文件夹的正确路径 ['text', 'css', 'normalize', 'css-builder']
                    // reqConf.paths

                    _.each(options.notMerge, function (name) {
                        emptyPaths[name] = 'empty:';
                    })

                    _.each(reqConf.paths, function (path, pathName) {
                        if (_.contains(['text', 'css', 'normalize', 'css-builder'], pathName)
                            || _.contains(options.moduleMerge, pathName)) {
                            widgetPaths[pathName] = helper.getRelativePath(appBasePath, path, source.origin);
                        } else {
                            emptyPaths[pathName] = 'empty:';
                        }
                    });
                    _.each(reqConf.packages, function (pkg) {
                        var clonePkg = _.clone(pkg);
                        if (!_.contains(options.notMerge, pkg.name)) {
                            clonePkg.location = helper.getRelativePath(appBasePath, clonePkg.location, source.origin);
                            widgetPackages.push(clonePkg);
                        }
                    });
                    return {
                        baseUrl: source.origin,
                        dir: source.target,
                        paths: _.extend({}, widgetRefPaths, widgetPaths, emptyPaths, options.buildPaths || {}),
                        modules: modules,
                        packages: widgetPackages
                    };
                });

            }
        };

        // 解决方案文件路径
        var solutionPath = options.solution === '' ? '' : helper.getRelativePath('./', options.solution, appTargetBasePath);
        var baseInclude = solutionPath === '' ? [] : [solutionPath];
        // 将每个 module 的主文件包含在站点主文件中
        var moduleInclude = _.compact(_.map(options.modules, function (mod) {
            if (mod.name === '.') return false;
            // return mod.source + '/' + mod.name + '/main';
            return helper.getRelativePath(appBasePath, mod.source + '/' + mod.name + '/main', appTargetBasePath);
        }));
        // 站点的 path 配置
        var sitePaths = {};
        _.each(reqConf.paths, function (path, pathName) {
            if (_.contains(options.notMerge, pathName)) {
                sitePaths[pathName] = 'empty:';
            } else {
                sitePaths[pathName] = path;
            }
        });
        var defaultSiteOptions = {
            appDir: options.appDir,
            baseUrl: options.baseUrl,
            dir: options.dir,
            modules: [{
                name: options.entry,
                include: baseInclude.concat(options.merge).concat(moduleInclude)
            }],
            paths: sitePaths,
            shim: reqConf.shim || {},
            packages: reqConf.packages || [],
            optimize: options.optimize,
            onBuildRead: function (moduleName, path, contents) {
                if (moduleName.indexOf('require-conf') > -1) {
                    return contents.replace(/debug\s*\:\s*(true|false)/g, 'debug: false, optimized: true');
                }
                if (solutionPath !== '' && moduleName === 'main') {
                    return 'window.verSolution="' + solutionPath + '";\n' + contents;
                }
                return contents;
            },
            preserveLicenseComments: false,
            removeCombined: options.removeCombined,
            fileExclusionRegExp: /^\./
        };

        var defaultWidgetOptions = {
            shim: reqConf.shim || {},
            optimize: options.optimize,
            // optimizeCss: "none",
            removeCombined: true,
            preserveLicenseComments: false,
            fileExclusionRegExp: /^\./,
            separateCSS: true,
            onBuildWrite: function (moduleName, path, contents) {
                // Bugfixed：当在未知的情况下，有可能会出现识别不了部件的情况
                var packageName = moduleName.substring(0, moduleName.indexOf('/main'));
                if (packageName.length > 0) {
                    return contents + "\ndefine('" + packageName + "', ['" + moduleName + "'], function (main) { return main; });";
                }
                return contents;
            }
        };

        grunt.initConfig({
            // 任务配置
            requirejs: {
                // 单个网站
                site: {
                    options: defaultSiteOptions
                },
                widget: {
                    options: defaultWidgetOptions
                }
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
                   options.dir + '/**/build.txt'
                ],
                output: [options.dir],
                others: options.clean,
                widgets: [options.dir + '/**/__temp__']
            },
            css_combo: {
                main: {
                    files: {
                        'public/styles/index.css': ['public/styles/index.css']
                    }
                }
            }
        });

        grunt.loadNpmTasks('grunt-contrib-requirejs');
        grunt.loadNpmTasks('grunt-contrib-concat');
        grunt.loadNpmTasks('grunt-contrib-copy');
        grunt.loadNpmTasks('grunt-contrib-clean');
        grunt.loadNpmTasks('grunt-css-combo');

        grunt.registerTask('site', ['requirejs:site']);

        grunt.registerTask('widgets', function () {
            var sources = helper.getSourcesFromModules(options.modules, reqConf);
            var reqModuleConfigsAndPaths = helper.getReqModulesAndPathsFromSources(sources);
            var sourcesReqConfig = helper.getSourcesReqConfig(sources, reqModuleConfigsAndPaths, options);


            // 分别为每个部件源进行打包
            _.each(sources, function (source, i) {

                if (sourcesReqConfig[i].modules === false) return;

                var options = _.extend({}, grunt.config('requirejs.widget.options'), sourcesReqConfig[i]);

                grunt.config('requirejs.widget' + i, { options: options });

                grunt.config('clean.widget' + i, {
                    src: [
                        source.target + '/**/templates/',
                        source.target + '/**/build.txt',
                        source.target + '/**/css.js',
                        source.target + '/**/css-builder.js',
                        source.target + '/**/normalize.js',
                        source.target + '/**/text.js',
                        source.target + '/**/styles/**'
                    ]
                });

                grunt.config('copy.widget' + i, {
                    expand: true,
                    cwd: source.target + '/',
                    src: '**',
                    dest: source.copy
                    // flatten: true,
                    // filter: 'isFile'
                })

                // 压缩该目录下所有插件
                grunt.task.run('requirejs:widget' + i);
                // 清理
                grunt.task.run('clean:widget' + i);
                // 拷贝部件
                grunt.task.run('copy:widget' + i);



            });

            grunt.task.run('clean:widgets');
        });

        grunt.registerTask('css-cmb', function () {
            var allStyleStream = '';
            var cssComboOptions = { files: {} };
            var cssTarget = options.cssTarget;
            var widgetStyles = [];
            var fs = require('fs');

            _.each(defaultSubPaths, function (p) {
                var src = path.join(options.dir, options.baseUrl, p);

                var thisStyles = grunt.file.expand([src + '/**/*.css', '!' + src + '/**/*.min.css']);
                widgetStyles.push(thisStyles);
            });

            _.each(widgetStyles, function (styles, idx) {
                var stream = '';
                _.each(styles, function (style) {
                    stream += '@import "' + helper.getRelativePath('./', style, cssTarget) + '";\n';
                });

                if (options.cssPack === "module") {
                    grunt.file.write(options.cssTarget + '/modules/module' + idx + '.css', stream);
                } else {
                    allStyleStream += stream;
                }
            });

            if (allStyleStream !== '') {

                // 生成 CSS 合并后文件
                grunt.file.write(options.cssTarget + '/modules.css', allStyleStream);

                if (options.cssPack === 'all') {
                    cssComboOptions.files[cssTarget + '/modules.css'] = [cssTarget + '/modules.css'];
                }
                //if (options.cssPack === 'module') {
                //    cssComboOptions.files[cssTarget + '/modules.css'] = _.map(fs.readdirSync(cssTarget + '/modules'),
                //        function (fileName) {
                //            return cssTarget + '/modules/' + fileName;
                //        });
                //}
            }

            grunt.config('css_combo.all', cssComboOptions);
        });

        grunt.registerTask('default', function () {
            grunt.task.run('clean:output');
            grunt.task.run('site');
            grunt.task.run('widgets');
            grunt.task.run('css-cmb');
            // grunt.task.run('pages');
            grunt.task.run('css_combo:all');
            grunt.task.run('clean:main');
            grunt.task.run('clean:others');


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
