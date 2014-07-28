'use strict';

module.exports = function (grunt) {
    var pkg = grunt.file.readJSON('package.json');
    var _ = require('underscore');
    var path = require('path');
    var reqConf = require(pkg.publish.config)();
    var build = require(pkg.publish.solution);

    var basePath = path.join(reqConf.appDir, reqConf.baseUrl);
    // 获取控件的路径
    var controlPaths = {};

    var setControlPath = function (widgetName) {
        controlPaths[widgetName] = 'empty:';
        controlPaths[widgetName + '/main'] = widgetName + '/main';
        controlPaths[widgetName + '/styles'] = widgetName + '/styles';
        controlPaths[widgetName + '/views'] = widgetName + '/views';
        controlPaths[widgetName + '/templates'] = widgetName + '/templates';
    }

    // 获取相对于某个基路径的真实路径
    var getRelativePath = function (originBasePath, originPath, basePath) {
        // 原路径是相对于 app 和 baseUrl 计算的，因此需要计算出相对于网站的实际路径
        // reqConf.appDir, reqConf.baseUrl
        var truePath = path.join(originBasePath, originPath);
        var dep = 10;  // 设定最多向上查找10次
        if (path.join(basePath, originPath).indexOf(path.join(reqConf.appDir)) < 0) {
            originPath = path.join(reqConf.appDir, reqConf.baseUrl, originPath);
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
    var getModules = function (sources) {

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
                setControlPath(dir);
                return {
                    name: dir + '/main',
                    // name: getRelativePath('./', source.origin, basePath) + '/' + dir + '/main',
                    exclude: ['text', 'css']
                };
            });
            return result;
        });
    };

    // 获取部件源的源路径和目标路径
    var widgetSources = [];

    _.each(build.modules, function (module) {
        widgetSources.push({
            origin: path.join(reqConf.appDir, reqConf.baseUrl, module.source, module.name, 'widgets'),
            target: path.join(reqConf.dir, reqConf.baseUrl, 'widgets/temp', module.name),
            copy: path.join(reqConf.dir, reqConf.baseUrl, 'widgets'),
            type: 'widget'
        });
        widgetSources.push({
            origin: path.join(reqConf.appDir, reqConf.baseUrl, module.source, module.name, 'plugins'),
            target: path.join(reqConf.dir, reqConf.baseUrl, 'plugins/temp', module.name),
            copy: path.join(reqConf.dir, reqConf.baseUrl, 'plugins'),
            type: 'plugin'
        });
    });

    // 部件源下的所有 module 配置
    var widgetModules = getModules(widgetSources);
    console.log(widgetModules);

    var widgetConfigs = _.map(widgetSources, function (source, index) {

        var widgetPaths = {};
        var widgetPackages = [];

        var modules = widgetModules[index];


        // 解析以下几个文件相对于部件文件夹的正确路径 ['text', 'css', 'normalize', 'css-builder']
        reqConf.paths
        _.each(reqConf.paths, function (path, pathName) {
            if (!_.contains(['text', 'css', 'normalize', 'css-builder'], pathName)) return;
            widgetPaths[pathName] = _.contains(build.publish.notMerge, pathName) ?
                'empty:' : getRelativePath(basePath, path, source.origin);
        });
        _.each(reqConf.packages, function (pkg) {
            var clonePkg = _.clone(pkg);
            clonePkg.location = _.contains(reqConf.cdn, pkg.name)
                ? 'empty:' : getRelativePath(basePath, clonePkg.location, source.origin);
            widgetPackages.push(clonePkg);
        });
        return {
            baseUrl: source.origin,
            dir: source.target,
            paths: _.extend({}, controlPaths, widgetPaths, reqConf.buildPaths || {}),
            modules: modules,
            packages: widgetPackages
        };

        //return {
        //    baseUrl: basePath,
        //    dir: source.target,
        //    paths: _.extend({}, controlPaths, reqConf.paths, reqConf.buildPaths || {}),
        //    modules: modules,
        //    packages: widgetPackages
        //};
    });

    var moduleInclude = _.map(build.modules, function (mod) {
        return mod.source + '/' + mod.name + '/main';
    });

    var solutionPath = getRelativePath('./', pkg.publish.solution, basePath);

    // 工程配置
    grunt.initConfig({
        // 元数据
        pkg: pkg,
        // 任务配置
        requirejs: {
            // 单个网站
            site: {
                options: {
                    appDir: reqConf.appDir,
                    baseUrl: reqConf.baseUrl,
                    dir: reqConf.dir,
                    modules: [
                        {
                            name: 'main', include: ['app', solutionPath]
                              .concat(build.publish.merge)
                              .concat(moduleInclude)
                        }
                    ],
                    paths: reqConf.paths,
                    shim: reqConf.shim,
                    packages: reqConf.packages,
                    // optimize: "none",  // 是否启用压缩 uglify
                    optimize: "none",
                    onBuildRead: function (moduleName, path, contents) {
                        if (moduleName.indexOf('require-conf') > -1) {
                            return contents.replace(/debug\s*\:\s*(true|false)/g, 'debug: false, optimized: true');
                        }
                        if (moduleName === 'main') {
                            return 'window.verSolution="' + solutionPath + '";\n' + contents;
                        }
                        return contents;
                    },
                    preserveLicenseComments: false,
                    removeCombined: true,
                    fileExclusionRegExp: /^\./
                }
            },
            widget: {
                options: {
                    shim: reqConf.shim,
                    optimize: "none", // uglify2
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
                }
            }
        },

        concat: {
            options: {
                separator: '\n'
            }
        },
        copy: {
            main: {
            }
        },
        clean: {
            // TODO: 这里写死了一些路径，需考虑一种更优雅的方式
            main: [
                'public/**/*.less',
                'public/**/build.txt',
                'public/scripts/layouts',
                'public/modules'
            ],
            vendor: [
                'public/vendor/backbone',
                'public/vendor/eventemitter2',
                'public/vendor/jquery',
                'public/vendor/pnotify',
                'public/vendor/underscore',
                'public/vendor/veronica',
                'public/vendor/veronica-mvc'
            ],
            source: [
                'frontend'
            ],
            widgets: ['public/widgets/temp', 'public/plugins/temp']
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

    // 打包所有部件
    grunt.registerTask('widgets', function () {

        // 分别为每个部件源进行打包
        _.each(widgetSources, function (source, i) {

            if (!widgetConfigs[i].modules) return;

            var options = _.extend({}, grunt.config('requirejs.widget.options'), widgetConfigs[i]);

            grunt.config('requirejs.widget' + i, { options: options });

            // 将该源下的所有css合并到一个css里，合并css文件的路径是：源路径 + /styles/all.css
            grunt.config('concat.widget' + i, {
                src: [source.origin + '/**/*.css', '!' + source.origin + '/**/*.min.css'],
                dest: source.target + '/styles/all.css'
            });

            grunt.config('clean.widget' + i, {
                src: [
                    source.target + '/**/templates/',
                    source.target + '/*/**/styles/',
                    source.target + '/**/build.txt',
                    source.target + '/**/css.js',
                    source.target + '/**/css-builder.js',
                    source.target + '/**/normalize.js',
                    source.target + '/**/text.js',
                    source.target + '/*/**/images/'
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
            //grunt.task.run('requirejs:widget' + i);
            // 合并该目录下所有CSS文件（解决在IE下31个样式表限制问题）
            grunt.task.run('concat:widget' + i);
            // 清理
            grunt.task.run('clean:widget' + i);
            // 拷贝部件
            grunt.task.run('copy:widget' + i);

        });

        grunt.task.run('clean:widgets');
    });

    grunt.registerTask('default', function () {
        grunt.task.run('site');
        grunt.task.run('widgets');
        //// grunt.task.run('pages');
        //grunt.task.run('css_combo');
        grunt.task.run('clean:main');
        grunt.task.run('clean:vendor');
    });

    grunt.registerTask('publish', function () {
        grunt.task.run('default');
        grunt.task.run('clean:source');

    });
};