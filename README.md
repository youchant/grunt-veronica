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
  },
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

#### reqConfig

类型：`Object` 默认值：`''`

用于 RequireJS 的配置项，包括：

* paths: 第三方库的路径
* shim: 
* packages: 第三方库的包路径

#### modules

类型：`Array` 默认值：`[]`

应用中的模块，最终模块的路径会由 source + name 组合而成，默认会查找该模块路径下的 `widgets` 和 `plugins` 文件夹，也就是说默认情况下，你应该将部件和插件放到这个位置，如果你放到其他文件夹下，就应该配置 subpaths，例如： 

```
[{
   name: 'base',  // 模块名称
   source: './modules'  // 模块放置的路径（该路径相对于应用的基路径）,
   subpaths: ['widgets/widgets1']  // 如果在默认路径下划分了子路径放置部件或插件，在这里配置
}]
```

它的模块目录为： ./modules/base，部件放置在 ./modules/base/widgets/widgets1 中，这个配置反映了一个事实：部件放置在某个已知路径的子文件夹中，也不会被识别，例如配置了部件放置在 ./modules/base/widgets 中，如果你放到 ./modules/base/widgets/widgets1 中则不会被识别，你应该为这个路径配置另外一个 `subpaths`

> **注意**
>
> 如果项目没有 module，那么打包时配置 name 为 '.'，并为每个部件源配置 subpaths
> ```js
> modules: [{
    name: '.',
    source: '.',
    subpaths: ['./widgets/base']
> }]
> ```

#### optimize

类型：`Object` 默认值：`{ paths: [] }`

是否压缩代码，如果不压缩代码，则传入`false`，这个属性接受一个对象，通过 paths 属性，可
设置哪些路径不需要被压缩，例如：

```
{
    paths: ['!**/*.min.js']
}
```

#### solution

类型：`String` 默认值：`''`

解决方案路径，没有单独的解决方案文件可不填

#### merge

类型：`Array` 默认值：`[]`

要合并进主文件的路径

示例：

```
merge: ['veronica-mvc', 'app']
```

#### notMerge

类型：`Array` 默认值：`[]`

从文件打包中排除的路径，不合并到任意文件中

#### moduleMerge

类型：`Array` 默认值：`[]`

打包 module 中的 widget 或 plugin 时，要合并的第三方库。

默认不会合并出现在module中的任何第三方库，这里的配置可让某些只在一个地方出现的第三方库合并到widget或plugin的主文件中

#### clean

类型：`Array` 默认值：`[]`

合并后清理的文件（夹）

#### buildPaths

类型：`Object` 默认值：`{}`

打包时采用的不同的路径

#### cssPack

类型：`String` 默认值：`'all'`

css打包的策略，现在暂只支持将所有 modules 的 css 文件合并到一个文件中

> **注意**
>
> 由于 IE6 - IE9 CSS样式的限制，因此在打包应考虑到在样式文件个数和样式选择器个数之间找到平衡关系。
参考：http://stackoverflow.com/questions/9906794/internet-explorers-css-rules-limits

#### cssTarget

类型：`String` 默认值：`'**/styles'`

打包css文件后的目标路径，该路径相对于当前打包的工作路径，默认是打包后应用路径下的 'styles' 文件夹

**removeCombined**

类型：`Boolean` 默认值：`true`

是否移除合并后的公共库，默认是 true，如果公共库会被其他应用所引用，则应设为 false

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

```
options: {
    appDir: './app',
    baseUrl: '.',
    dir: './release',
    reqConfig: require('./app/require-conf.js')(),
    modules: [{
        name: '.',
        source: '.',
        subpaths: [
            './widgets/base',
            './widgets/music',
            './widgets/account'
        ]
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
   ├── solutions
   |   └── build.js
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

solutions/build.js

```js
……
return {
    // 模块
    modules: [{
           name: 'music',
           source: '../modules-A'
       } , {
           name: 'account',
           source: './modules-B'
       }, {
        name: 'group',
        source: '../modules-B'
    }]
……
```

Gruntfile.js

```
options: {
    appDir: './project/project-large/proj-main',
    baseUrl: '.',
    dir: './release',
    reqConfig: require('./project-main/modules-core/require-conf.js')(),
    solution: './solutions/build.js',
    modules: require('./solutions/build.js').modules
}
```

## Release History
_(Nothing yet)_
