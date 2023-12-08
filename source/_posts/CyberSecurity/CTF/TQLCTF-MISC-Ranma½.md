---
title: TQLCTF-MISC-Ranma½
date: 2022-2-22 22:36:41
tags: [CTF,Misc,Python]
categories: 
 - [Cyber Security,CTF]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682438327/Typera/2023/04/33bcab1c0fc91bd552a41c8dc39d23ac.png
---

## MISC

### Ranma½
终归还是少了点经验，以及一些奇奇怪怪的知识。。。

#### UTF-8可变长编码
首先一定要详细了解 UTF-8 编码，
完整的表如下：
![image-20230425235627337](https://res.cloudinary.com/sycamore/image/upload/v1682438191/Typera/2023/04/fdfd2d8940cbcb3dad4d6ee71124333c.png)

> 图中一行的 `xxx...` 部分组合起来即为对应的 Unicode 代码

可能这样还是比较难以理解，那就仔细阅读下面的例子就行了：

希伯来语字母 א 的 Unicode 代码是U+**05D0**，UTF-8 是 **0xD7 0x90**，
则 Unicode to UTF-8 转换如下：
- 首先判断它属于哪一行：
U+0080到U+07FF，观察表中对应行，说明它使用双字节，即 110**xxxxx** 10**xxxxxx**
- 然后分解十六进制的**0x05D0**，换算成二进制就是（0）101-1101-0000
- 最后，把这11位数按顺序填入前后的"x"部分：110**10111** 10**010000**

110**10111** 10**010000** 换成16进制就是 **D7 90**，即对应的 UTF-8 编码

看懂了上述例子，UTF-8 to Unicode 就是简单反过来就行了

#### 信息隐藏的思路
到这里，我们就了解了UTF-8编码 “可变长” 的特点，
既然它是可变长的，那么我们就可以利用**这个特性**去隐藏信息：
直接用一般的文本编辑器打开题目给的文件，会有很多乱码，因为它们大多是逐字节转换的，而UTF-8的单个字符 可能有1~4个字节的长度，

因此，如果我们要隐藏 **A** 字符，Unicode 就是 **0x41**，换算成二进制就是 **100 0001**，
再假设我们要把它藏到 UTF-8编码的**第二行 U+0080 到 U+07FF** 里面，那么我们一共需要 11 个数字，
于是人为地在高位填充 4 个 0，得到：**000-0100-0001**，再将这 11 个数字填入表中对应的 x 部分，就得到：110**00001** 10**000001**，即 UTF-8 编码的 **C1 81**，从而骗过大部分的文本编辑器

#### 解题过程
实际上有挺多方法，用vim打开，或者用WinRAR的 “查看”打开（这个属实有点奇怪）
![image-20230425235636085](https://res.cloudinary.com/sycamore/image/upload/v1682438200/Typera/2023/04/1771f16334a694ed24fac59a74971010.png)
或者可以写脚本分析：

```python
import binascii

x,y,z=[],[],[]
with open("Ranma","rb") as f:
	try:
		while 1:
			Str = f.read(1)
			if not Str:break
			x.append(binascii.hexlify(Str))
	finally:
		f.close() # 读文件，将16进制字串存入list x

for i in range(len(x)):
	if int(x[i],16)<128:
		y.append(chr(int(x[i],16))) # 小于128的直接chr()转换ASCII码
	if int(x[i],16)>127:
		y.append(bin(int(x[i],16))) # 大于128的转换为二进制分析

for i in range(len(y)):
	if '0b110' in y[i]: # 如果是第二行的情况
		y[i]=chr(int(y[i][5:]+(y[i+1])[4:],2))
	if '0b1110' in y[i]: # 如果是第三行的情况
		y[i]=chr(int(y[i][6:]+(y[i+1])[4:]+(y[i+2])[4:],2))
for i in range(len(y)):
	if '0b' not in y[i]: # 去除多余项并合并
		z.append(y[i])
print(''.join(z))
```
得到：
> KGR/QRI 10646-1 zswtqgg d tnxcs tsdtofbrx osk ndnzhl gna Ietygfviy Idoilfvsu Arz (QQJ) hkkqk maikaglvusv ubyp cw ekg krzyj'o kitwkbj alypsdd.  Wjs rzvmebrwoa duwcuosu pqecgqamo cw ekg IFA, uussmpu, ysum aup qfxschljyk swks pcbb khxnsee drdoqpgpwfyv cbg xeupctzou, oql gneg ylv nsg bb zds upygzrxzkjh fq XVT-8, wpr uxxvnw qt wpvy isdz. XVT-8 kif zds tsdtofbrxegktf qt szryafmtqi hkm sahz LD-DUQLQ egjuv, auqjllvtc qfxschljvrehp hlvv iqyk omjehog, sieyafj lqf cwprx ocwezcfh bugp fvwb qb XA-NYYWZ gdniha oap oip wtoqacgnsee wq cwprx rocfhu. HTTPZB{QFOLP6_KRZ1Q}

观察猜测是维吉尼亚加密，
1. 直接爆破 [在线网址](https://www.dcode.fr/vigenere-cipher) ：
点击AUTOMATIC DECRYPTION，爆破即可

2. 看官方wp，（这个密钥要拿到脑洞也太大了吧。。。）
依次列举出 UTF-8 编码文字的长度，长度为 1 的字符转换为**点**，长度为 2 的字符转换为**线**，长度为 3 的字符转换成**分隔符**，经过 **Morse** 解读获得密钥
(￣▽￣)"
![image-20230425235644738](https://res.cloudinary.com/sycamore/image/upload/v1682438209/Typera/2023/04/150cd961046421d365382e0994f34fba.png)
flag：`TQLCTF{CODIN6_WOR1D}`
