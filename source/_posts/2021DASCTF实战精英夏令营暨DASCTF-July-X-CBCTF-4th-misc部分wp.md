---
title: 2021DASCTF实战精英夏令营暨DASCTF July X CBCTF 4th misc部分wp
date: 2021-11-26 18:20:21
tags: [CTF,Misc,Python]
categories: 
 - CTF
cover: https://res.cloudinary.com/sycamore/image/upload/v1682434776/Typera/2023/04/e4f4c5ecbc0fc45c6bbe9fd3ced0996e.png
---

:::warning
文章时间太早，图片丢失
:::

## Misc-red_vs_blue

简单来说就是66轮试错，同一次nc里面的答案是一样的，要么输入r,要么输入b，错了就输入y重来，因为有时间限制，只能上脚本（本来还想手搓）
```python
from pwn import *

# sh=process("./buu--rip")  local端
sh = remote('node4.buuoj.cn', 28699)
s = []
i=1
tag=0
q = sh.recvuntil(':')
while True:
    if i==66:
        break;
    if tag==0:
        sh.send('r')
        q=sh.recvuntil(':')
        print(q)
        if b'again'  not in q:
            i+=1;s.append('r')
            continue
        else :
             sh.send('y')
             for m in s:
                 sh.recvuntil(':')
                 sh.send(m)
             sh.recvuntil(':')  #
             tag = 1
             continue

    elif tag==1:
        sh.send('b')
        q=sh.recvuntil(':')
        print(q)
        if b'again' not in q:
            i += 1;s.append('b')
            continue
        else:
              sh.send('y')
              for m in s:
                  sh.recvuntil(':')
                  sh.send(m)
              sh.recvuntil(':')#
              tag = 0
              continue

print(i)
sh.interactive()
```
代码稍微有点小问题，第66轮直接跳出来了，懒得改了。。。
就随便猜一下然后就可以拿到flag。

------------
## Misc-funny_maze
跟前面那题
差不多的思路，就是典型的迷宫问题多搞几次就能出来flag.

```python
from pwn import *

dirs=[(0,1),(1,0),(0,-1),(-1,0)] #当前位置四个方向的偏移量
path=[]              #存找到的路径
 
def mark(maze,pos):  #给迷宫maze的位置pos标"2"表示“到过了”
    maze[pos[0]][pos[1]]=2
 
def passable(maze,pos): #检查迷宫maze的位置pos是否可通行
    return maze[pos[0]][pos[1]]==0
 
def find_path(maze,pos,end):
    mark(maze,pos)
    if pos==end:
        print(pos,end=" ")  #已到达出口，输出这个位置。成功结束
        path.append(pos)
        return True
    for i in range(4):      #否则按四个方向顺序检查
        nextp=pos[0]+dirs[i][0],pos[1]+dirs[i][1]
        #考虑下一个可能方向
        if passable(maze,nextp):        #不可行的相邻位置不管
            if find_path(maze,nextp,end):#如果从nextp可达出口，输出这个位置，成功结束
                print(pos,end=" ")
                path.append(pos)
                return True
    return False
 
def see_path(maze,path,leng):     #使寻找到的路径可视化
    length = 0
    for i,p in enumerate(path):
        if i==0:
            maze[p[0]][p[1]] ="E"
        elif i==len(path)-1:
            maze[p[0]][p[1]]="S"
        else:
            maze[p[0]][p[1]] =3
    print("\n")
    for r in maze:
        for c in r:
            if c==3:
                print('\033[0;31m'+"*"+" "+'\033[0m',end="")
                length+=1
            elif c=="S" or c=="E":
                print('\033[0;34m'+c+" " + '\033[0m', end="")
            elif c==2:
                print('\033[0;32m'+"#"+" "+'\033[0m',end="")
            elif c==1:
                print('\033[0;;40m'+" "*2+'\033[0m',end="")
            else:
                print(" "*2,end="")
        print()
    print(length+1)
    leng=length+1
    return leng
 
def maze_change(num):
    MAZE=[]
    row=col=0
    M=str(sh.recvuntil("P"))
    print(M)
    MAZE.append([])
    for m in M:
        if col == num:
            MAZE.append([])
            row+=1
            col=0
        if m == '\n':
            continue
        elif m == '#':
            MAZE[row].append(1)
            col+=1
        elif m == ' ':
            MAZE[row].append(0)
            col+=1
        elif m == 'S':
            MAZE[row].append(0)
            start=(row,col)
            col+=1
        elif m =='E':
            MAZE[row].append(0)
            end=(row,col)
            col+=1
        elif m =='P':
            break
    print(MAZE)
    return MAZE, start, end
def gets(num):
    maze=[]
    start=(0,0)
    end=(0,0)
    maze,start,end=maze_change(num)
    find_path(maze,start,end)
    leng=0
    leng=see_path(maze,path,leng)
    sh.sendline(str(leng+1))

sh=remote("node4.buuoj.cn",27512)
print(sh.recvuntil(b'game'))
sh.sendline("1")
gets(11)
print(sh.recvuntil(b'level!'))
dirs=[(0,1),(1,0),(0,-1),(-1,0)] #当前位置四个方向的偏移量
path=[]              #存找到的路径

gets(21)
print(sh.recvuntil(b'level!'))
dirs=[(0,1),(1,0),(0,-1),(-1,0)] #当前位置四个方向的偏移量
path=[]              #存找到的路径

gets(31)
print(sh.recvuntil(b'level!'))
dirs=[(0,1),(1,0),(0,-1),(-1,0)] #当前位置四个方向的偏移量
path=[]              #存找到的路径

gets(101)
sh.interactive()
```
其中迷宫问题的部分代码是从[这里](https://blog.csdn.net/qq_29681777/article/details/83719680)复制来的
值得注意的是多次循环，变量初始化的问题，我排查了好久(￣_￣|||)
一开始没有注意到这个问题，还以为是我哪个顺序出错了，后来才发现。

------------
## Misc-ezSteganography
比赛时只解出前半个，记录一下比赛时的错误思路	(。﹏。)：
（~~根据第二个提示，后半大概率是Green通道里的图片藏了啥信息，然而第一个提示里的QIM quantization估计是加密方法，然后，我们就纠在QIM是啥的问题上了。。。~~ ）

然而实际上只要把g0和g1通道的两张图异或一下就可以了，就用stegsolve里的Image Combiner的功能

![前半flag加第一条提示](https://cdn.jsdelivr.net/gh/nonesycamore/sycamore_cdn/wp-content/uploads/2021/09/post-187-613781a296735.png)

前半flag加第一条提示 ↑

![第二条提示](https://cdn.jsdelivr.net/gh/nonesycamore/whitzard_cdn/wp-content/uploads/2021/09/post-187-613781a30a77f.png)

第二条提示 ↑

![后半个flag](https://cdn.jsdelivr.net/gh/nonesycamore/whitzard_cdn/wp-content/uploads/2021/09/post-187-613781a410b63.png)

后半个flag ↑

------------

## Misc-Just a GIF
『赛后复现』和国赛[running_pixel](https://mochu.blog.csdn.net/article/details/116855242)的题基本是一个思路，gif分离出451张图，分为41组，每组11张图。
然后每组的第i张和第一组的第i张作比较，不一样的画黑，就可以了。
```python
from PIL import Image

path = "Just_a_GIF/"  #填自己的路径
for i in range(11):
    picn = Image.new("RGB",(119,83),(255,255,255))
    for j in range(1,41):
        p1=Image.open(path+str(i)+'.png')
        p2=Image.open(path+str(i+j*11)+'.png')
        for w in range(119):
            for h in range(83):
                if p1.getpixel((w,h)) != p2.getpixel((w,h)):
                    picn.putpixel((w,h),(0,0,0))
    picn.save(str(i)+'.png')

```
然后就拿到11张图片 ↓
![请添加图片描述](https://cdn.jsdelivr.net/gh/nonesycamore/whitzard_cdn/wp-content/uploads/2021/09/post-187-613781a48b444.png)

手动拼接?	↓
![请添加图片描述](https://cdn.jsdelivr.net/gh/nonesycamore/whitzard_cdn/wp-content/uploads/2021/09/post-187-613781a4d72e5.png)

网上搜一下，貌似是DataMatrix，扫出flag
>DASCTF{6bb73086aeb764b5727529d82b084cce}

------------
## Misc-Nuclear wastewater
『赛后复现』彩色的二维码，比赛最后经队友提示，看了看它RGB才有了思路。
所有的色块竟然都是，三个通道两个为0，剩一个有值，那肯定密码就藏在这里了。
写个脚本把数字转出来
```python
from PIL import Image
img = Image.open("Nuclear wastewater.png")
for i in range(3):
    for j in range(0,230,10):
        for t in range(0,230,10):
            rgb=list(img.getpixel((t,j)))
            if rgb[i]>32 and rgb[i]<128:
                print(chr(rgb[i]),end='')
```
得到这个

> Ys>UEJht#?ppeEFtstR#~:hi~tR:@s@YRteK#e@KsR&E&:eR:Eht/#iKtteYKhYKYhhhihhKtC2tt:HVEesY&#@Rj!seRi:eitEtKsetKtEE:hh#h#eYKYihhYK(Kt@iSY$KY/@pRsEetsip:~h@eeEs!E&&::EsEEei#/iYe#/ieKKt//iKYhh

发现很多重复的字符，想到使用词频分析看一下
```python
from collections import Counter
f = 'Ys>UEJht#?ppeEFtstR#~:hi~tR:@s@YRteK#e@KsR&E&:eR:Eht/#iKtteYKhYKYhhhihhKtC2tt:HVEesY&#@Rj!seRi:eitEtKsetKtEE:hh#h#eYKYihhYK(Kt@iSY$KY/@pRsEetsip:~h@eeEs!E&&::EsEEei#/iYe#/ieKKt//iKYhh'
print(Counter(f))
```
![请添加图片描述](https://cdn.jsdelivr.net/gh/nonesycamore/whitzard_cdn/wp-content/uploads/2021/09/post-187-613781a570599.png)

得到：`theKEYis:#R@/&p~!>UJ?FC2HVj(S$`
初步尝试，发现这个不太对，密码错误。。。
瞻仰一波套神的wp之后，原来 `>UJ?FC2HVj(S$` 词频为1，所以顺序可能出错，推测词频为1的部分不是密码，
所以得到密码：

> '#R@/&p~!'

解压得到flag.txt....	(T_T)
果然我还是太天真了，还以为能直接拿到flag...
瞅瞅内码，然后看到了这个：

![请添加图片描述](https://cdn.jsdelivr.net/gh/nonesycamore/whitzard_cdn/wp-content/uploads/2021/09/post-187-613781a60a7f6.png)

哦吼，还有个零宽？
包含U+200C U+200D U+200E，[网址](https://330k.github.io/misc_tools/unicode_steganography.html)
隐藏内容是：
>2021年4月13日，核废水在Citrix县的CTX1市尤为严重

好吧，完全不知道....(；′⌒`)
搜了一下Citrix CTX1，大概是某种加密，
终归还是了解的太少了
![请添加图片描述](https://cdn.jsdelivr.net/gh/nonesycamore/whitzard_cdn/wp-content/uploads/2021/09/post-187-613781a6921a9.png)

emm...搜索发现 [CyberChef](https://gchq.github.io/CyberChef/) 可以进行解密	§(*￣▽￣*)§
解两次得到flag：
>flag{98047de9ce5aaa4c0031fb55e9dfac70}

------------
到这里，misc就结束啦！ (oﾟvﾟ)ノ
