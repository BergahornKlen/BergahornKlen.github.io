---
title: 西湖论剑_YUSA的小秘密
date: 2021-11-29 23:02:55
tags: [CTF,Misc,Python]
categories: 
 - [Cyber Security,CTF]
cover: https://res.cloudinary.com/sycamore/image/upload/v1682437178/Typera/2023/04/c5a9db9e102c912faba686513f8d522c.png
---

## Misc

### YUSA的小秘密
[附件下载](https://cdn.jsdelivr.net/gh/noneSycamore/annex/yusa_small_secret.zip "附件下载")
题目描述:LSB，但又不是LSB，众所周知不止RGB...
直接用stegsolve打开有两个通道能直接看到flag，可是噪点实在太多了.
联想到题目描述，开始查找资料.
可以参考[Bytectf2020的Misc: Hardcore Watermark 01](https://bytectf.feishu.cn/docs/doccnqzpGCWH1hkDf5ljGdjOJYg#qHRUCR)这道题
> 图片中每个像素可以通过三个通道来表示，常见的是 **R** (red) **G** (green) **B** (blue) 模式。而本题用到的通道是 YCrCb。

通过 `cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)`对 img 图片数据进行色彩空间转换，
然后保存图片：
```python
from cv2 import cv2
img = cv2.imread('Yusa.png')
cv_color = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
cv2.imwrite('img.png', cv_color)
```
再用stegsolve看一下通道就可以了
![image-20230425232822379](https://res.cloudinary.com/sycamore/image/upload/v1682436506/Typera/2023/04/0c489cb73329a1ef49146321f8fde3bd.png)
