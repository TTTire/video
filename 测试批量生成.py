#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试版 - 只生成前5张图片，快速看效果
"""

import requests
import os
from pathlib import Path

OUTPUT_DIR = "测试图片"

# 测试用的5个prompt
TEST_PROMPTS = [
    ("001", "分屏画面，左边是外卖骑手递过方形餐盒，右边是超市货架上整排圆形饮料瓶。Cinematic lighting, hyper-realistic, dark moody color palette, 8k resolution"),
    ("002", "桌上堆叠的方形外卖盒"),
    ("003", "冰柜里整齐排列的圆形饮料瓶"),
    ("004", "一个人拿着外卖盒和饮料瓶，表情疑惑"),
    ("005", "镜头推进，包装盒和瓶子开始发光，浮现出经济学符号。Cinematic lighting, hyper-realistic, dark moody color palette, 8k resolution"),
]

def generate_image(prompt, output_path):
    """生成图片"""
    try:
        # Pollinations.ai API
        url = f"https://image.pollinations.ai/prompt/{requests.utils.quote(prompt)}"
        
        print(f"正在生成: {output_path.name}...")
        
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        print(f"✅ 成功保存: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ 生成失败: {e}")
        return False

def main():
    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(exist_ok=True)
    
    print("="*50)
    print("测试批量生成 - 只生成前5张图片")
    print("="*50)
    
    success = 0
    fail = 0
    
    for seq_num, prompt in TEST_PROMPTS:
        output_path = output_dir / f"镜头{seq_num}.png"
        
        if generate_image(prompt, output_path):
            success += 1
        else:
            fail += 1
    
    print("\n" + "="*50)
    print(f"测试完成！")
    print(f"成功: {success} 张")
    print(f"失败: {fail} 张")
    print(f"保存位置: {output_dir.absolute()}")
    print("="*50)

if __name__ == "__main__":
    main()
