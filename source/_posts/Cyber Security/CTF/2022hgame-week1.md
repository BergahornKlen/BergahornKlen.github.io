---
title: 2022hgame week1
date: 2022-2-5 12:46:27
tags: [CTF,Crypto,Misc,Python]
categories: 
 - CTF
cover: https://res.cloudinary.com/sycamore/image/upload/v1682438101/Typera/2023/04/8798b063d769d1c7172303ddd222745a.png
---

## Crypto

### Dancing_Line
有点靠脑洞啊，这道crypto不讲武德 /_ \ ，不过仔细看看还是大概能猜到的~

![](https://res.cloudinary.com/sycamore/image/upload/v1682437580/Typera/2023/04/d902f3ec8dfa08547fca2ab2f0d0f237.bmp)
图片上有一条线，放大可以看出，每隔一小段会有一个黑点
![image-20230425234706530](https://res.cloudinary.com/sycamore/image/upload/v1682437729/Typera/2023/04/f02b3b2084d99f2b7639a572df5b0d8a.png)
所以，我用python PIL库写个脚本导出黑点的坐标

```python
from PIL import Image

img=Image.open('./Dancing_Line.bmp')
w,h=img.size
#print(w,h)
pos=[]
for i in range(w):
	for j in range(h):
		if img.getpixel((i,j))!=(255,255,255):
			if img.getpixel((i,j))==(0,0,0):
				pos.append((i,j))
print(pos)
```
得到如下字串：
> [(0, 0), (5, 3), (8, 8), (13, 11), (16, 16), (20, 20), (22, 26), (28, 28), (33, 31), (36, 36), (40, 40), (45, 43), (48, 48), (51, 53), (53, 59), (58, 62), (63, 65), (66, 70), (70, 74), (72, 80), (77, 83), (81, 87), (83, 93), (87, 97), (90, 102), (93, 107), (98, 110), (100, 116), (105, 119), (109, 123), (112, 128), (116, 132), (120, 136), (122, 142), (127, 145), (131, 149), (133, 155), (135, 161)]

仔细找找规律可以发现，相邻黑点坐标之差均为8
同理导出线上所有点的坐标，不难看出，相邻点的坐标，要么是横坐标加1，要么是纵坐标加1，

再结合相邻黑点坐标差为8这个数字，所以推测这应该是一个二进制编码 （。＾▽＾）
几番尝试之后确定为，纵坐标增长为1，横坐标增长为0

最后将二进制转换为ASCII码，即可得到flag

完整exp如下：
```python
from PIL import Image
import binascii

img=Image.open('./Dancing_Line.bmp')
w,h=img.size
#print(w,h)
pos=[]
pos_all=[]
t=''
for i in range(w):
	for j in range(h):
		if img.getpixel((i,j))!=(255,255,255):
			if img.getpixel((i,j))==(0,0,0):
				pos.append((i,j))
			pos_all.append((i,j))

#print(pos)
#print(pos_all)
for k in range(1,len(pos_all)):
	if pos_all[k][0]-pos_all[k-1][0]==0:
		t=t+'1'
	elif pos_all[k][1]-pos_all[k-1][1]==0:
		t=t+'0'
t=int(t,2)
print(t.to_bytes((t.bit_length() + 7) // 8, 'big').decode())
```
### English Novel
做是做出来了，就是原来写的脚本稀烂，由于标点符号的原因，整理出来的keys，有些地方不太对，这就导致我最开始写的脚本，得到的flag其实是长这样的：`hgame{V0_y0u_kn0w_'En0wn-pla1ntext_derzwn'?}`
(￣▽￣)"

然后我直接猜出最终的flag... 讲真挺好猜的
不过看过别人的wp之后，我就在原基础上改善了（现在没问题了）

这道题思路其实很简单，
题目给了我们两个文件夹，一个original，一个encrypt，还给了一个flag.enc和encrypt.py
首先都打开来看看，original里面是打乱的English Novel的原文，encrypt里面大概就是通过某种加密得到的打乱的密文，flag.enc里面大概就是用同样方法加密得到的flag， encrypt.py就是加密的方法

打开encrypt.py看看，其实就是 $c=(m+k) mod 26$ 
那解密就是 $m=(c-k) mod 26$ （c为密文，m为明文，k为密钥）
所以显然我们的任务就是得到这个密钥k，然后解密flag.enc里的密文

而题目把一大堆明文和密文都给我们了，所以就是已知明文攻击，
所以， $k=(c-m) mod 26$
关键点就在怎么把打乱encrypt和original一一对应起来，而且要排除标点符号对求key的干扰
因为仔细看encrypt.py的话，标点符号虽然不会参与加密，但是还是会占据一个key的位置

用 isalpha() 的功能判断字母，然后把字母替换成 "*"，保留标点符号，这样得到的字符串相当于一个标准的模板，对于对应的original和encrypt来说，他们的template都是一样的，这样就能把原文和密文对应起来。
找到了对应的原文和密文，解得正确的key就比较容易了（不过要记得排除标点符号的干扰）
exp如下：
```python
import os

# 函数功能：把字母变成‘*’，保留标点符号
def get_feature(s):
	return "".join(['*' if c.isalpha() else c for c in s]) 

# 用original文件夹初始化template，并将原文保存在txts_ori里面
path_ori='original'
files_ori=os.listdir(path_ori)
template=[]
txts_ori = []
for file in files_ori:
	position = path_ori+'\\'+ file
	with open(position, "r",encoding='utf-8') as f:
		data = f.read()
		m=get_feature(data)
		if len(m)!=0 and m not in template:
			txts_ori.append(data)
			template.append(m)

# 处理encrypt文件夹内的数据，在template里匹配对应的原文，得到对应的密钥
keys=[-1]*410
path_enc='encrypt'
files_enc=os.listdir(path_enc)
for file in files_enc:
	position = path_enc+'\\'+ file
	with open(position, "r",encoding='utf-8') as f:
		data = f.read()
		m=get_feature(data)
		if len(m)!=0 and m in template:
			for i in range(len(data)):
				k=((ord(data[i])-ord(txts_ori[template.index(m)][i]))%26)
				j=i%(len(keys))
				#保证每次写入keys时该位置没有写入过，且对应密文不是标点符号
				if keys[j]==-1 and m[i]=='*':
					keys[j]=k
# 用keys解密
enc="xaawr{B0_d0l_cs0m_'Pp0mn-odn1vpabt_deqzcq'?}"
result = ""
for i in range(len(enc)):
	if enc[i].isupper():
		result += chr((ord(enc[i]) - keys[i] - ord('A')) % 26 + ord('A'))
	elif enc[i].islower():
		result += chr((ord(enc[i]) - keys[i] - ord('a')) % 26 + ord('a'))
	else:
		result += enc[i]
print(result)
```
### Easy RSA
这道题，还是不细说了，属于是最最最基本的RSA了，
该给的全都给了，连p, q都直接给了
exp:
```python
import gmpy2
from Crypto.Util.number import long_to_bytes

string=[]
for (e,p,q,c) in [(12433, 149, 197, 104), (8147, 131, 167, 6633), (10687, 211, 197, 35594), (19681, 131, 211, 15710), (33577, 251, 211, 38798), (30241, 157, 251, 35973), (293, 211, 157, 31548), (26459, 179, 149, 4778), (27479, 149, 223, 32728), (9029, 223, 137, 20696), (4649, 149, 151, 13418), (11783, 223, 251, 14239), (13537, 179, 137, 11702), (3835, 167, 139, 20051), (30983, 149, 227, 23928), (17581, 157, 131, 5855), (35381, 223, 179, 37774), (2357, 151, 223, 1849), (22649, 211, 229, 7348), (1151, 179, 223, 17982), (8431, 251, 163, 30226), (38501, 193, 211, 30559), (14549, 211, 151, 21143), (24781, 239, 241, 45604), (8051, 179, 131, 7994), (863, 181, 131, 11493), (1117, 239, 157, 12579), (7561, 149, 199, 8960), (19813, 239, 229, 53463), (4943, 131, 157, 14606), (29077, 191, 181, 33446), (18583, 211, 163, 31800), (30643, 173, 191, 27293), (11617, 223, 251, 13448), (19051, 191, 151, 21676), (18367, 179, 157, 14139), (18861, 149, 191, 5139), (9581, 211, 193, 25595)]:
	d = int(gmpy2.invert(e, (p-1)*(q-1)))
	m = pow(c, d, p*q)
	string.append(long_to_bytes(m).decode())
Str=''.join(string)
print(Str)
```
## Misc
### 这个压缩包有点麻烦
这道题属实是把那些，基本的有关压缩包的方法都涉及到了，挺全面的入门题
#### 暴力破解
打开压缩包，三个文件都被加密，不太正常，所以考虑暴力破解或者是伪加密能直接解出。
用010打开，文件最后出现提示：
> Pure numeric passwords within 6 digits are not safe!

所以用ARCHPR暴力破解，范围仅勾选数字，得到密码：483279
#### 字典攻击
上一轮的密码解压得到三个文件：flag.zip、password-note.txt、README.txt
要解压flag.zip又需要密码，打开README.txt看到提示：
> I don't know if it's a good idea to write down all the passwords.

显然passwords可能的都被写在password-note.txt里面了
用ARCHPR的字典攻击即可，得到密码：&-`;qpCKliw2yTR\

之后又尝试写了一个脚本，运行也可以得到密码：
```python
import zipfile
zip_file = zipfile.ZipFile('flag.zip')
zip_list = zip_file.namelist()
f=open('password-note.txt', "r")
lines = f.readlines()
for password in lines:
    try:
        zip_file.extractall(path='Test', pwd=password[:-1].encode('utf-8'))
        print("the password is {}".format(password[:-1]))
    except:
        #print("the password is {}".format(password[:-1]))
        continue
```
#### 明文攻击
解压后又得到了一个flag.zip和README.txt... (/▽＼)
flag.zip中的内容一样被加密，其中包含flag.jpg和README.txt
仔细观察发现，两个README.txt的大小都是68KB，所以考虑可能是明文攻击

再看一下README.txt，有提示
> If you don't like to spend time compressing files, just stores them.

联系flag.zip的加密算法：ZipCrypto Store，已经基本可以确定是明文了，

把给的README.txt用Zip的存储方式加密，打开对比两个README.txt的CRC值，
均为966AC0E8

再次使用ARCHPR，选择明文攻击，
等待1~2分钟左右点击停止即可，不用等它执行完
#### 伪加密
明文攻击后得到了去除密码的一个zip，
解压得到flag.jpg如下：
![hgameM10](https://res.cloudinary.com/sycamore/image/upload/v1682437720/Typera/2023/04/11a450d036a1c818089a7374c1f615a3.jpg)
实际上从7z里面是能直接再点开这个flag.jpg的，可以看到里面还有一个flag.jpg (￣_,￣ )
显然这个flag.jpg后面还藏了一个压缩包，使用binwalk分离，得到4FC5.zip

虽然有点奇怪，这里7z为啥不能直接打开这个新的压缩包，但尝试之后发现这个确实是伪加密
直接更改下图选中内容为 00 即可
![image-20230425234814596](https://res.cloudinary.com/sycamore/image/upload/v1682437699/Typera/2023/04/63704e239d39fc6a92fc0cb525370a7b.png)

终于得到了flag：
![image-20230425234917756](https://res.cloudinary.com/sycamore/image/upload/v1682437761/Typera/2023/04/53c11a8e13bbe5c3adfdef057ed8493c.png)

### 好康的流量
Wireshark打开，右键->追踪流->TCP流，得到base64格式的图片文件：
![image-20230425234931156](https://res.cloudinary.com/sycamore/image/upload/v1682437776/Typera/2023/04/c529efa42a73e54e0034029e844f57ca.png)

[在线base64转换图片](https://www.toolnb.com/tools/base64ToImages.html)得到：

![image-20230425234943176](https://res.cloudinary.com/sycamore/image/upload/v1682437788/Typera/2023/04/7299c09dac948f983d1c5126055c377d.png)

stegsolve打开，G2得到一个条形码：

![image-20230425234952577](https://res.cloudinary.com/sycamore/image/upload/v1682437796/Typera/2023/04/473ee4ccb1baae2f6d8baebff4eb969b.png)
保存后，[在线扫描图片](https://demo.dynamsoft.com/barcode-reader/)得到前半段flag `hgame{ez_1mg_`

然后在Analyse->Data Extract里面，
按下图所示操作，可以得到后半flag `Steg4n0graphy}`
![image-20230425235001793](https://res.cloudinary.com/sycamore/image/upload/v1682437806/Typera/2023/04/c026469fb7ab3fceba720421bc3cea72.png)

### 群青(其实是幽灵东京）
拿到.wav文件，发现属性里藏了提示：
![image-20230425235012882](https://res.cloudinary.com/sycamore/image/upload/v1682437816/Typera/2023/04/61191b2c8ce2754adbb5f4270499d7fc.png)
提示使用用SilentEye，
直接Decode显示不正确，所以猜测要使用密码

Audacity打开，查看频谱图发现：
![image-20230425235021424](https://res.cloudinary.com/sycamore/image/upload/v1682437826/Typera/2023/04/9b37356f52ea60ba659337e1615d5527.png)
猜测大概就是key了：Yoasobi
解密得到一串网址，貌似是一个音频文件的地址
![image-20230425235030317](https://res.cloudinary.com/sycamore/image/upload/v1682437834/Typera/2023/04/097e85d689cebdbc315a2e1d74bf20c1.png)
访问下载得音频文件S_S_T_V.wav

搜索SSTV，得知：SSTV（Slow-scan television）是一种图像传输方法，主要由业余无线电操作员使用，通过单色或彩色无线电发送和接收静态图像。

原本想使用RX-SSTV解码器，但是貌似我的电脑上还需要安装一个叫 Virtual Audio Cable 的虚拟声卡，实在是太麻烦了 ( ╯□╰ )
所以我就干脆在手机上下载了 Robot36，用电脑播放音频，手机接听，最后得到这样一张图
![image-20230425235041961](https://res.cloudinary.com/sycamore/image/upload/v1682437848/Typera/2023/04/267cd6c07e0bbbdcb3b0b57595089963.png)

然后扫码得到 flag：`hgame{1_c4n_5ee_the_wav}`
