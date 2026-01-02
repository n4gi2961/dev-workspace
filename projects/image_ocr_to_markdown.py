#!/usr/bin/env python3
"""
複数の画像ファイルにOCRを実行し、結果を一つのMarkdownファイルに保存するプログラム
"""

import os
import sys
from pathlib import Path
from PIL import Image
import pytesseract
from datetime import datetime

def get_image_files(folder_path):
    """指定されたフォルダから画像ファイルを取得"""
    folder = Path(folder_path)
    if not folder.exists():
        raise FileNotFoundError(f"フォルダが見つかりません: {folder_path}")
    
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp'}
    image_files = []
    
    for file_path in folder.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            image_files.append(file_path)
    
    return sorted(image_files)

def extract_text_from_image(image_path):
    """画像からテキストを抽出"""
    try:
        with Image.open(image_path) as img:
            # 日本語対応のためjpnを追加
            text = pytesseract.image_to_string(img, lang='jpn+eng')
            return text.strip()
    except Exception as e:
        return f"エラー: {str(e)}"

def create_markdown_content(image_files, folder_path):
    """画像ファイルからMarkdownコンテンツを作成"""
    content = []
    content.append(f"# OCR結果\n")
    content.append(f"フォルダ: {folder_path}")
    content.append(f"作成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    content.append(f"処理画像数: {len(image_files)}\n")
    content.append("---\n")
    
    for i, image_file in enumerate(image_files, 1):
        content.append(f"## 画像 {i}: {image_file.name}\n")
        
        print(f"処理中: {image_file.name}")
        extracted_text = extract_text_from_image(image_file)
        
        if extracted_text:
            content.append("```")
            content.append(extracted_text)
            content.append("```\n")
        else:
            content.append("*テキストが検出されませんでした*\n")
    
    return "\n".join(content)

def main():
    if len(sys.argv) != 2:
        print("使用方法: python image_ocr_to_markdown.py <画像フォルダのパス>")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    
    try:
        # 画像ファイルを取得
        image_files = get_image_files(folder_path)
        
        if not image_files:
            print("画像ファイルが見つかりませんでした。")
            return
        
        print(f"{len(image_files)}個の画像ファイルが見つかりました。")
        
        # OCR処理とMarkdownコンテンツ生成
        markdown_content = create_markdown_content(image_files, folder_path)
        
        # 出力ファイル名を生成
        output_file = Path(folder_path) / "ocr_results.md"
        
        # Markdownファイルに保存
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"OCR結果を保存しました: {output_file}")
        
    except Exception as e:
        print(f"エラーが発生しました: {str(e)}")

if __name__ == "__main__":
    main()