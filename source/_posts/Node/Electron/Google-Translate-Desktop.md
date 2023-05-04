---
title: Google-Translate-Desktop
date: 2023-05-02 14:46:42
tags: [Electron,Google Translate,node]
categories: 
 - [Node,Electron]
---

项目地址：[Google-Translate-Desktop](https://github.com/noneSycamore/Google-Translate-Desktop)

# 准备工作

## 选择环境

[node v16.20.0]{.label .info} / [electron v20.3.12]{.label .info}

## 基本方案

利用 `npm` 插件: [google-translate-api](https://www.npmjs.com/package/google-translate-api) 

该插件提供了一个API接口：translate(text, options)，能实现谷歌翻译的基本功能

用 electron 搭建程序的主要页面，用该插件实现简单的翻译

## 具体功能

- [ ]  自动检测语言并能选择翻译的目标语言
- [ ]  详细释义？
- [ ]  划词翻译
    - [ ]  替换、复制翻译结果
    - [ ]  快捷键呼出

# 开发实现

## 搭建环境

```shell
nvm install 16 lts  # 安装v15的新环境
nvm use 16.20.0

npm init  # 初始化npm库
npm install electron@20.3.12 --save-dev  # 安装electron
npm install electron-builder  # 打包插件
npm install electron-store  # 数据存储插件

```

## 基本页面

通过 [electron]{.label .info} 实现。

细化主页面构成：

- [x]   +++**顶部标题栏** 
	传统地去掉难看的原配Windows标题栏
	-   图标
	-   软件名称
	-   最小化/最大化/关闭
	+++
- [x]  +++ **菜单栏**
    功能切换
    -   翻译文本
    -   翻译文件？
    -   翻译网页？
    
    设置
    -   快捷键
    +++
- [ ]  +++**具体功能实现页面** 
    翻译功能栏
    -   选择源语言/目标语言
    -   左右切换
    
    翻译内容/翻译结果
    +++

## 翻译功能

