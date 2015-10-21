# grunt-veronica

> 一个 grunt 插件，用于构建 veronica 搭建的项目

## 入门

该插件需要 Grunt `~0.4.5`

如果你没使用过 [Grunt](http://gruntjs.com/) , 请查阅 Grunt [入门指南](http://gruntjs.com/getting-started) ，
了解如何创建一个 [Gruntfile](http://gruntjs.com/sample-gruntfile)，以及怎样安装并使用 Grunt 插件。

完成上面的工作后，你可以通过以下命令安装这个插件：

```shell
npm install grunt-veronica --save-dev
```

安装完毕后，在你的 Gruntfile 文件里，加入如下 JavaScript 代码：

```js
grunt.loadNpmTasks('grunt-veronica');
```

## "veronica" 任务

### 概览

在 Gruntfile 里, 添加一个 `veronica` 数据对象，传入到 `grunt.initConfig()` 里。

```js
grunt.initConfig({
  veronica: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  }
});
```

### 配置项

#### appDir

类型：`String` 默认值：`''`

应用程序根路径

#### baseUrl

类型：`String` 默认值：`''`

应用程序基路径，即主文件：main.js 所在的相对路径

#### dir

类型：`String` 默认值：`''`

打包后的应用程序根路径

```js
appDir: './app',
baseUrl: './',
dir: './app-release',
```

#### reqConfig

类型：`Object` 默认值：`''`

用于 RequireJS 的配置项，包括：`paths`、`shim`、`packages`


#### optimize

类型：`Object` 默认值：`{ paths: [] }`

是否压缩代码，如果不压缩代码，则传入`false`，这个属性接受一个对象，通过 paths 属性，可
设置哪些路径不需要被压缩，例如：

```
{
    paths: ['!**/*.min.js']
}
```

#### notMerge

类型：`Array` 默认值：`[]`

从文件打包中排除的路径，不合并到**任意文件**中

```js
notMerge: ['jquery'],
```

#### clean

类型：`Array` 默认值：`[]`

合并后清理的文件（夹），配置的路径相对于当前 Grunt 的执行路径

```js
clean: [
  './app-release/widgets/**/*.css',
  './app-release/widgets/**/*.html',
  './app-release/modules',
  './app-release/**/require-conf.js'
],
```

#### moduleMerge

类型：`Array` 默认值：`[]`

打包 module 中的 package 时，要合并的第三方库。

默认不会合并出现在module中的任何第三方库，这里的配置可让某些只在一个地方出现的第三方库合并到jsPack的Package主文件中

#### entryPack

类型：`Array` 默认值：`[]`

对入口文件进行打包，这里的配置是标准 RequireJS 的 `modules` 配置

示例：

```js
entryPack: [{
    name: './main',
    include: ['./require-conf', 'veronica', 'jquery', 'underscore',
        'text', 'css', './modules/dashboard/main', './modules/user-control/main']
}]
```

#### jsPack

类型：`Object` 默认值：`{}`

配置package的路径，进行package打包


**jsPack.defaults**

每个配置项的默认参数设置，可以更改此配置

默认的参数：

```js
{
	name: '',
    origin: function(){
    	return './modules/' + this.name;
    },
    target: './widgets',
    unique: false
}
```

**jsPack.paths**

类型：`Array` 默认值：`[]`

要打包的路径配置，每个数组项包括以下几个配置：

* name: **必填项** 路径的名称，这个通常与项目中的 module 名称相同
* origin：`Function or String` 要查找package的路径，相对于 baseUrl
* target：所有package打包后放置的路径，相对于 dir 和 baseUrl
* unique：是否将所有package文件夹名称更改为唯一命名（适用于多层级放置的package）

配置项也支持String的方式设置，这样它设置的是配置项中的`name`属性

```js
jsPack: {
    defaults: {
        target: './widgets2'
    },
    paths: [{
        name: 'dashboard'
    }, 'user-control', {
        name: 'others',
        origin: './modules/others',
        target: './widgets',
        unique: true
    }]
},
```

#### cssPack

类型：`Object` 默认值：`'{}'`

css打包的策略，现在暂只支持将所有 Package 的 CSS 文件合并到一个文件中

> **为什么要合并**
>
> 由于[IE6 - IE9 CSS样式的限制](http://stackoverflow.com/questions/9906794/internet-explorers-css-rules-limits)，如果CSS分散在不同的Package中，可能会触发这个限制，因此在打包应考虑到在样式文件个数和样式选择器个数之间找到平衡关系。

配置项：

* mode: 合并模式，默认值：`'all'`
* name: 最终合并后的CSS文件名，默认值：`'module.css'`
* src：查找待合并CSS的路径，默认值：`['./widgets']`
* target：合并后文件的放置路径，默认值：`options.dir + '/styles'`

示例：

```js
cssPack: {
    mode: 'all',
    name: 'module.css',
    src: ['./widgets'],
    target: './app-release/styles'
}
```

#### remote

远程目录打包

**remote.vendor**

类型：`Array` 默认值：`[]`

项目使用的远程第三方库压缩包配置，在打包时会下载这个压缩包并解压到本地文件夹 `__local__`

```js
vendor: [{
    path: 'http://xxx.xx/',
    name: 'bower_components.zip'
}]
```

**remote.modules**

类型：`Array` 默认值：`[]`

项目使用的远程 Package 配置，在打包时会下载这个压缩包并解压到本地文件夹 `__local__/modules`

```js
modules: [{
    name: 'basic.zip',
    path: 'http://xxxxx/'
}]
```

**remote.copy**

在项目打包结束后，需要进行拷贝的文件（夹），这里使用 `grunt.contrib.copy` 的配置

### 示例

#### 稍小型项目

* 目录结构

```
── app
   ├── widgets
   |   ├── base
   |   │   ├── header/
   |   │   └── portal/
   |   ├── music
   |   │   ├── widget1/
   |   │   └── widget2/
   |   └── account
   |       └── widget3/
   ├── main.js
   └── require-conf.js
── release/
── Gruntfile.js
```

* 打包配置

Gruntfile.js

```
options: {
    appDir: './app',
    baseUrl: '.',
    dir: './release',
    reqConfig: require('./app/require-conf.js')(),
    entryPack: [{
    	name: './main',
        include: ['./require-conf']
    }],
    jsPack: [{
    	name: '',
        origin: './widgets',
        unique: true
    }]
}
```

#### 稍大型项目

* 目录结构

```
── root
   ├── modules-A
   |   └── music
   |     ├── widgets/
   |     ├── plugins/
   |     └── main.js 
   ├── modules-B
   |   ├── account
   |   |   ├── widgets/
   |   |   ├── plugins/
   |   |   └─ main.js
   |   └── group
   |       ├── widgets/
   |       ├── plugins/
   |       └── main.js 
   |── project-main
   |  ├── modules-core
   |  |   └── base
   |  |     └── widgets
   |  |       ├── header/
   |  |       └── portal/
   |  ├── main.js
   |  └── require-conf.js
   ├── release
   └── Gruntfile.js
```

* 打包配置

Gruntfile.js

```
options: {
    appDir: './proj-main',
    baseUrl: '.',
    dir: './release',
    reqConfig: require('./project-main/modules-core/require-conf.js')(),
    entryPack: [{
    	name: './main'
    }],
    jsPack: [{
    	name: 'base',
        origin: './modules-core/base/widgets'
    },{
    	name: 'music',
        origin: '../modules-A/music/widgets'
    },{
    	name: 'music',
        origin: './modules-A/music/plugins'
    },{
    	name: 'account',
        origin: './modules-B/account/widgets'
    }],
    cssPack: {
        mode: 'all',
        name: 'module.css',
        src: ['./widgets'],
        target: './release/styles'
    }
}
```

## Release History

