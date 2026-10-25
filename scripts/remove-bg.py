"""イラストの無地の背景を透明にして、ウェブ用の正方形 WebP にする。

使い方: python -I scripts/remove-bg.py <元の PNG のフォルダ> <出力先フォルダ> [--size 512]

- 四隅から、背景に近い色だけを塗りつぶして透明にする（輪郭線の内側は消えない）
- 輪郭のまわりの中間色は半透明にし、背景色を差し引く（暗い背景でもふちが出ない）
- キャラのまわりを切りつめ、余白をつけた正方形に縮める
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

TOLERANCE = 28   # 背景とみなす色の差
EDGE_RANGE = 90  # これより背景から遠い色は不透明にする
MARGIN = 0.06    # 余白（一辺に対する割合）


def background_color(rgb: np.ndarray) -> np.ndarray:
    k = 8
    corners = np.concatenate([
        rgb[:k, :k].reshape(-1, 3), rgb[:k, -k:].reshape(-1, 3),
        rgb[-k:, :k].reshape(-1, 3), rgb[-k:, -k:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def remove_background(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert('RGB')).astype(np.float64)
    bg = background_color(rgb)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))

    # 背景に近い画素を 0、それ以外を 255 にして、四隅から 128 で塗りつぶす
    # fromarray の画像は配列と中身を共有して読み取り専用なので、copy してから塗る
    near = Image.fromarray(np.where(dist <= TOLERANCE, 0, 255).astype(np.uint8), 'L').copy()
    h, w = dist.shape
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if near.getpixel(xy) == 0:
            ImageDraw.floodfill(near, xy, 128)
    is_bg = np.asarray(near) == 128

    # 背景のとなり（2画素）だけ、色の差に応じて半透明にする
    grown = np.asarray(Image.fromarray((is_bg * 255).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(5))) > 0
    edge = grown & ~is_bg
    alpha = np.ones((h, w))
    alpha[is_bg] = 0.0
    alpha[edge] = np.clip(dist[edge] / EDGE_RANGE, 0.0, 1.0)

    # 半透明の画素から背景色を差し引く
    a = alpha[..., None]
    out_rgb = np.where(a > 0, (rgb - bg * (1 - a)) / np.maximum(a, 1e-6), 0)
    out = np.dstack([np.clip(out_rgb, 0, 255), alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def fit_square(img: Image.Image, size: int) -> Image.Image:
    box = img.getchannel('A').getbbox()
    if box is None:
        raise ValueError('キャラが見つかりません（全部が背景になりました）')
    char = img.crop(box)
    side = round(max(char.size) / (1 - 2 * MARGIN))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(char, ((side - char.width) // 2, (side - char.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def check(img: Image.Image) -> None:
    a = img.getchannel('A')
    s = img.width - 1
    corners = [a.getpixel(xy) for xy in [(0, 0), (s, 0), (0, s), (s, s)]]
    center = a.getpixel((img.width // 2, img.height // 2))
    if any(corners) or center != 255:
        raise ValueError(f'透明にできていません（四隅 {corners}、中心 {center}）')


def main() -> None:
    parser = argparse.ArgumentParser(description='イラストの背景を透明にして WebP にする')
    parser.add_argument('src', type=Path)
    parser.add_argument('dst', type=Path)
    parser.add_argument('--size', type=int, default=512)
    args = parser.parse_args()

    files = sorted(args.src.glob('*.png'))
    if not files:
        raise ValueError(f'{args.src} に PNG がありません')
    args.dst.mkdir(parents=True, exist_ok=True)
    for f in files:
        clear = remove_background(Image.open(f))
        check(clear)  # 余白をつける前に確かめる（余白の四隅は必ず透明なので）
        out = fit_square(clear, args.size)
        path = args.dst / f'{f.stem}.webp'
        out.save(path, 'WEBP', quality=90, method=6)
        print(f'{path}（{path.stat().st_size // 1024} KB）')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    try:
        main()
    except Exception as e:  # 1行のメッセージにして終了コード 1 で止める
        print(f'[remove-bg] {e}', file=sys.stderr)
        sys.exit(1)
