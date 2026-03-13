#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量图片生成工具 - 使用 Pollinations.ai 免费API
从视频脚本中提取图片描述，批量生成并保存
"""

import re
import time
import requests
import os
from pathlib import Path

# 配置
OUTPUT_DIR = "批量生成的图片"  # 输出目录
DELAY_SECONDS = 2  # 每张图之间的延迟（秒），避免请求过快

# Pollinations.ai API (完全免费，无需API key)
def generate_image(prompt, output_path):
    """
    使用Pollinations.ai生成图片
    :param prompt: 图片描述
    :param output_path: 保存路径
    :return: 成功返回True，失败返回False
    """
    try:
        # Pollinations API URL
        url = f"https://image.pollinations.ai/prompt/{requests.utils.quote(prompt)}"
        
        print(f"正在生成: {output_path.name}")
        print(f"  Prompt: {prompt[:50]}...")
        
        # 发送请求
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        
        # 保存图片
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        print(f"  ✓ 完成")
        return True
        
    except Exception as e:
        print(f"  ✗ 失败: {e}")
        return False

def extract_prompts_from_script(script_path):
    """
    从Markdown脚本中提取图片描述
    :param script_path: 脚本文件路径
    :return: [(序号, 类型, 描述), ...]
    """
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    prompts = []
    
    # 匹配表格中的图片行
    # 格式: | 序号 | 类型 | 脚本旁白 | 视觉元素 | 时长 |
    pattern = r'\|\s*(\d+)\s*\|\s*🖼️\s*图片\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*\d+s\s*\|'
    
    matches = re.findall(pattern, content)
    
    for match in matches:
        seq_num = int(match[0])
        narration = match[1].strip()
        visual = match[2].strip()
        
        # 使用视觉元素作为prompt
        prompts.append((seq_num, '图片', visual))
    
    return prompts

def batch_generate(script_path):
    """
    批量生成图片
    :param script_path: 脚本文件路径
    """
    # 创建输出目录
    output_dir = Path(script_path).parent / OUTPUT_DIR
    output_dir.mkdir(exist_ok=True)
    
    # 提取prompt
    print("正在提取图片描述...")
    prompts = extract_prompts_from_script(script_path)
    print(f"找到 {len(prompts)} 张图片需要生成\n")
    
    # 批量生成
    success_count = 0
    fail_count = 0
    
    for i, (seq_num, img_type, prompt) in enumerate(prompts, 1):
        print(f"\n[{i}/{len(prompts)}] 镜头 {seq_num}")
        
        # 生成文件名
        output_path = output_dir / f"镜头{seq_num:03d}.png"
        
        # 生成图片
        if generate_image(prompt, output_path):
            success_count += 1
        else:
            fail_count += 1
        
        # 延迟，避免请求过快
        if i < len(prompts):
            time.sleep(DELAY_SECONDS)
    
    # 总结
    print(f"\n{'='*50}")
    print(f"批量生成完成！")
    print(f"成功: {success_count} 张")
    print(f"失败: {fail_count} 张")
    print(f"保存位置: {output_dir}")
    print(f"{'='*50}")

if __name__ == "__main__":
    # 脚本路径
    script_path = "进行中/外卖盒子为什么是方的，饮料瓶却是圆的.md"
    
    # 执行批量生成
    batch_generate(script_path)
