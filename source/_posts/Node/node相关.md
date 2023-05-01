---
title: Node相关
date: 2023-04-30 17:42:04
tags: [node,npm,plugs]
categories: 
 - [Node]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682849816/Typera/2023/04/d39197fd00b4e17f12ac1a852c12fd7e.png
---

## node版本控制

大部分时候，并不是版本越新越好，开发过程中经常会遇到某些好用的插件只支持较低版本的`Nodejs`，这时候就需要用到版本控制。

使用[nvm]{.label .success}，可以轻松管理版本。实用命令如下：

```shell
nvm install [版本号] [lts]  # 安装特定版本的node
nvm use [版本号]  # 切换特定版本的node
nvm list  # 列出已安装的node版本，星号标注当前使用的版本
```

## 项目仓库

`package.json`是非常重要的文件，其中记录了项目的配置信息。

最好加一个`.gitignore`文件，其中记录`git`上传时忽略更改的目录和文件，基本上需要包含`*.log`以及`node_modules/`，其中前者是可能存在的日志文件，后者是项目本地安装的插件

这也体现了`package.json`文件的重要性，因为通常插件安装目录是不会上传的，所以每次`clone` `GitHub`项目的时候，都是没有安装插件的状态，在执行任何更改之前都要执行命令：`npm install --force`

而`package.json`文件中有部分就记录了项目中应该安装的插件，上述命令也正是根据该文件中的这一部分来安装插件的。

## git大文件管理

也许有时你的项目中出现了大文件，即大于100MB的文件，这时候用`git`是上传不上去的，这就需要用到 `Git LFS`

```shell
git lfs install  # 安装Git LFS
git lfs track "..."  # 要追踪的大文件名，可为 *.exe 的格式
git add .gitattributes  # 配置文件
```

然后就是`add/commit/push`的常规操作了

## npm插件编写

...（5.1结束回去粘贴）