---
title: SCTF复现
date: 2022-1-30 00:18:22
tags: [CTF,Pwn,Misc,Python]
categories: 
 - [Cyber Security,CTF]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682437447/Typera/2023/04/cc5ef5d743e36e64258472e8363cede3.png
---

## MISC

###  fumo_xor_cli（1.16）
啊啊啊，做这道题的时候就差一点，两张需要xor的图也导出来了，就是第一张那个需要叠加的图貌似排反了 ┭┮﹏┭┮
~~（做的时候就发现两张图长度都是一样的，难怪我说xor出来不太对劲。。。）~~
#### 第一张图
nc连上之后，发现出来了一堆彩色字符
python PIL转为图片，发现中间有两张图片部分有点奇怪
搜索了一下大概是ANSI转义字符，大致格式如下：
>\x1b[ 38 ; 2 ;  208 ; 243 ; 251 m9
>38;2;*r*;*g*;*b* Set text colour to an RGB value (e.g. `\x1b[38;2;255;255;0m`)

由于 编程水平稀烂，总之写的转png的代码。。。一言难尽
```python
from pwn import *
from PIL import Image
r=remote("124.70.150.39",2333)
img=[]
k=0
while(k<56):
	img.append(Image.new("RGB",(133,50)))

	r.recvuntil(b'\x1b[')
	s=r.recvuntil(b'\x1b[')
	j=0
	while j<50:
		i=0
		while 1:
			if s==b'A\x1b[':
				s=r.recvuntil(b'\x1b[')
				#print(s)
			else:
				s=r.recvuntil(b'\x1b[')
				#print(s)
				if b'\n'in s:
					break
				#print(s.split(b';')[2:])
				pixTuple=(int((s.split(b';')[2:])[0]),int((s.split(b';')[2:])[1]),int((s.split(b';')[2:])[2][:-4]))
				img[k].putpixel((i,j),pixTuple)
				i=i+1
		j=j+1
	img[k].save('/1/%d.png'%(k))
	k=k+1
```
所以我们得到了56张图片，emm...中间有两张是，五彩斑斓的，肯定有问题，
![SM1](https://res.cloudinary.com/sycamore/image/upload/v1682436722/Typera/2023/04/1fe97ece1c8993cbf990893b9dd0679d.png)![SM2](https://res.cloudinary.com/sycamore/image/upload/v1682436754/Typera/2023/04/eea64334d4a3ac700d91945121083752.png)

#### 第二张图
在Lu1u的提示下，原来这里面还有个网址，进入(https://mp.weixin.qq.com/s/E_iDJBkVEC4jZanzvqnWCA0)
在最后找到了一张fumo的图片
![SM3](https://res.cloudinary.com/sycamore/image/upload/v1682436784/Typera/2023/04/3ca22b531d34b89abc0f97bc0c306804.png)
放大发现了一个间隔为9的点阵，因为感觉这些点的颜色和上面得到的那两张图挺像的，所以想到继续可以把这些点提出来合成一张图片

```python
from PIL import Image

img0=Image.new('RGB',(100,133))
img1=Image.open('./fumo.png')
w,h=img1.size
i=1
ni=0
j=1
nj=0
while i<w:
	j=1
	nj=0
	while j<h:
		if(j==1198):
			break
		img0.putpixel((ni,nj),img1.getpixel((i,j)))
		j=j+9
		nj=nj+1
	i=i+9
	ni=ni+1
img0.show()
```
![SM4](https://res.cloudinary.com/sycamore/image/upload/v1682436814/Typera/2023/04/244e58d3d0b2a5daf7ee5837e5d8beb1.png)
####  XOR
前面得到的两张图均为133x50，而第二张图100x133，这不是巧了，
前两张张图加在一起，跟后面的那张长宽一样，再结合题目fumo_xor_cli
emm... XOR啊
思路就有了，~~结果就拼图这一步，方向错了〒▽〒~~
先观察一下四个角的像素点，把那两张图旋转一下，拼在一起
最后使用stegsolve异或一下就可以了
可能是因为拼图做的太糙了，所以异或出来的图有亿点不太对劲
![SM5](https://res.cloudinary.com/sycamore/image/upload/v1682436840/Typera/2023/04/a7cb74294bd4da8aa2f732cbc86f4c4b.bmp)
ps处理了一下总算好看了
![SM6](https://res.cloudinary.com/sycamore/image/upload/v1682436868/Typera/2023/04/8898d7e36e8d29377d803605af7967da.png)

### in_the_vaporwaves（1.17/1.18）

此前我对音频隐写了解甚少，只会简单地使用Audacity，对音频文件做一些基本的观察、操作，
本题中涉及到Python的wave库使用，那就可以正好趁这个机会去学习一下。

#### 观察原文件

通过Audacity打开c.wav，播放的时候稍微有点杂音，但听不出有什么不太对的地方 (/▽＼)
放大来看，可以看出左右声道的波形貌似正好上下相反：
![image-20230425233447828](https://res.cloudinary.com/sycamore/image/upload/v1682436891/Typera/2023/04/942c468dbd87e4787052099f715283e8.png)

#### ①使用Wave库
使用python的Wave库将左右声道加起来，导出为一个a.wav的文件
> **nchannels**:声道数，**sampwidth**:量化位数，**framerate**:采样频率，**nframes**:采样点数

Wave写入对象
> **Wave_write.setnchannels(n)**
> 设置声道数。

> **Wave_write.setsampwidth(n)**
> 设置采样字节长度为 n。

> **Wave_write.setframerate(n)**
> 设置采样频率为 n。

> Wave_write.writeframes(data)
> 写入音频帧并确保 nframes 是正确的。 如果输出流不可查找且在 data 被写入之后写入的总帧数与之前设定的 nframes 值不匹配将会引发错误。

Write读取对象
> **Wave_read.getnframes()**
> 返回音频总帧数。
> **Wave_read.readframes(n)**
> 读取并返回以 bytes 对象表示的最多 n 帧音频。

struct库：将字节串解读为打包的二进制数据
> **struct.unpack(format, buffer)**
> 根据格式字符串 format 从缓冲区 buffer 解包（假定是由 pack(format, ...) 打包）。 结果为一个元组，即使其只包含一个条目。 缓冲区的字节大小必须匹配格式所要求的大小，如 calcsize() 所示。
> **struct.pack(format, v1, v2, ...)**
> 返回一个 bytes 对象，其中包含根据格式字符串 format 打包的值 v1, v2, ... 参数个数必须与格式字符串所要求的值完全匹配。

参照官方wp，编写的脚本：
```python
import wave
import struct
with wave.open("c.wav",'rb') as c:
	with wave.open("a.wav",'wb') as a:
		a.setnchannels(1)
		a.setsampwidth(2)  #此处量化位数应改为2
		a.setframerate(44100)
		for i in range(c.getnframes()):
			l,r=struct.unpack('hh', c.readframes(1))
			d=l+r
			a.writeframes(struct.pack('h',d))
```
但是，实际运行的时候，我发现这个脚本貌似有点问题...
如果直接套用运行出来的音频长这样：
![image-20230425233457628](https://res.cloudinary.com/sycamore/image/upload/v1682436900/Typera/2023/04/c6b92eaad52ca5f54cbb80e1c01191cc.png)
然后我仔细检查发现，官方wp的量化位数设成了1，改成2就可以了... (。_。)
（着实花了我好久，还以为是我自己写错了）
出来的a.wav如下图
![image-20230425233505802](https://res.cloudinary.com/sycamore/image/upload/v1682436908/Typera/2023/04/47a2223d0102f0f858b27c6b0cc851ae.png)

但是，这脚本运行的时间也太长了吧，**[Finished in 262.9s]**  (￣▽￣)"
所以我又找到了一个比较快捷的方法：
#### ②ffmpeg
使用ffmpeg进行双声道合并，
从[链接](http://www.ffmpeg.org)（https://johnvansickle.com/ffmpeg/）下载ffmpeg到Linux环境下，运行：
`ffmpeg -i c.wav -f wav -ac 1 -ab 128k -y 1_dan1.wav`命令，
获得a.wav文件。

这次得到的a.wav是这样的：
![image-20230425233516666](https://res.cloudinary.com/sycamore/image/upload/v1682436919/Typera/2023/04/6e8ff45b5b28216617a2427f50628c81.png)
差别不大~
这就是比较常规的摩斯密码了，转换后得到flag

#### 摩斯电码音频转文字（1.19）
emm... 我顺带研究了一下，如何用python把摩斯密码从音频文件里直接读出来，
这个脚本我另外找了一道题试验了一下，应该是没啥问题的，
（它只适用于单声道的摩斯电码，所以使用前要先处理好音频文件）
稀烂的编程水平就不提了，代码如下：
```python
import wave
from scipy.io import wavfile

filename = 'a.wav'
WAVE = wave.open(filename)
sample_frequency, audio_sequence = wavfile.read(filename)
space=[]
voice=[]
l1=0
l2=0
for i in range(WAVE.getparams().nframes):
    if(audio_sequence[i]<=10 and audio_sequence[i]>=-10):
        l1=l1+1
        continue
    elif((audio_sequence[i-1]<=10 and audio_sequence[i-1]>=-10) and (audio_sequence[i]>10 or audio_sequence[i]<-10)):
        if l1>1:
            space.append(l1)
        l1=0
for i in range(WAVE.getparams().nframes):
    if(audio_sequence[i]>10 or audio_sequence[i]<-10):
        l2=l2+1
        continue
    elif((audio_sequence[i-1]>10 or audio_sequence[i-1]<-10) and (audio_sequence[i]<=10 and audio_sequence[i]>=-10) and (audio_sequence[i+1]<=10 and audio_sequence[i+1]>=-10)):
        voice.append(l2)
        l2=0

m_s=min(space)
M_s=max(space[1:])
m_v=min(voice)
def tran(i):
    if(voice[i]//m_v==1):
        return '.'
    else:
        return '-'
Str=''
for i in range(len(space)):
    if(space[i]//m_s==1):
        Str=Str+tran(i)
    elif(space[i]>M_s):
    	voice.insert(i,voice[i])
    	Str=Str+'/'
    else:
        Str=Str+tran(i)+'/'
Str=Str+tran(len(voice)-1)
print (Str)
```
## pwn
> pwn部分...由于我手残删掉了保存源文件，最后只问学长要到了其中两道题的，对我复现造成了极大的困扰，不过幸好这次的官方wp挺详细的，还可以对着wp一点一点的想，但我是菜鸡本菜，还是花了超多的时间去复现 ╥﹏╥... 不过总体来说收获还是挺多的

### Dataleak（1.29）
~~（隔了挺久的... 除了中间混了个hgame，还有HWS入营赛(虽然太菜了没啥用)，当然还有在认真地摸鱼啦）~~

连上远程，需要leak的数据长度为22，
IDA查看cJSON_PWN：
![image-20230425233526169](https://res.cloudinary.com/sycamore/image/upload/v1682436929/Typera/2023/04/4dcc2553fda4e522e344eccb3f71b8fd.png)
内存结构还是比较清楚的
按定义顺序，先是buf，然后是v5，最后是v6(存要leak的数据的地方)
两次循环，每次buf、v5，写入数据长14，结尾均有\x00
每次cJSON_Minify()先处理buf的字符，然后读出v5中11字节

#### 漏洞点
一共应该有两个漏洞点，可以从给的so文件中查看，
- 处理 /* 的时候，会不断遍历中间的字符直到遇到 \x00 ~~（或 */ ）~~，可能造成越界
![image-20230425233533907](https://res.cloudinary.com/sycamore/image/upload/v1682436937/Typera/2023/04/560f7380f89320b8d0bfa86942368be9.png)
- 处理 " 的时候，如果遇到 \ ，会越过两个字符
![image-20230425233541340](https://res.cloudinary.com/sycamore/image/upload/v1682436946/Typera/2023/04/0d185944b3f9a89c3f0cebb68e2e1cdd.png)

其中，第一个漏洞会将遍历到的字符舍去，所以后续的字符会填充到遍历过的字符位置上（包括/*），而第二个漏洞只会越过 \ 后的两个字符，中间遍历的字符将会保留。

所以会有多个方法实现data的泄露，而第一个漏洞能够达成的效果强于第二个，所以可以全程使用第一个漏洞完成泄露
#### 漏洞利用
由于一次只能读取11个字符，所以需要leak两次，
但大致思路就是要利用漏洞，先越过buf后的 \x00，让 cJSON_PWN 能继续处理v5的字符，
然后变换 /* 的位置，将v5内的字符替换为我们所需要的data
##### 方法1
如果两个漏洞都想利用到的话，可以先使用第二个漏洞，将 \ 出现的位置放在buf的末尾（就是第14 个字符），从而越过后面的 \x00 继续处理v5，
然后 /* 放在v5的开头，直接替换后面16个data的位置（算上开头的 /* 和末尾的 \x00 一共16个）
**exp1：**`"aaaaaaaaaaaa\/*aaaaaaaaaaaa`
获得前11个data

要获得后11个data，必须要把前11个data放到buf里面，才能让后11个buf出现在v5里被读出来，
这里再用第二个漏洞实在是太麻烦了（仔细想了想，**貌似也不可能**），所以就用第一个解决。

一个的 /* 直接放在开头，把后面的16个字符换进来，另一个的 /* 放在第6个字符的位置，这样加上后面包括 \x00 在内的字符，一共有11个，
这样就把前11个data再换到buf里面，这样后11个data就正好再v5里面被读取
**exp2：**`/*aaaaaaaaaaaaaaaaa/*aaaaaaa`
获得后11个data。（实际上**exp2**前后两个可以颠倒，效果一致，因为这里的exp无论是先换16个字符还是先换那11个，都是一样的）
##### 方法2
方法2只变了leak前11个data的方法，后11个data的方式是一致的
把 /* 放在buf的末尾，算上 \x00 一共会替换4个字符，为防止data的前4个字符被换进buf，先用aaaa组成v5的前4个，然后再加上 /* ，替换出后面的data
**exp：**`aaaaaaaaaaaa/*aaaa/*aaaaaaaa`
