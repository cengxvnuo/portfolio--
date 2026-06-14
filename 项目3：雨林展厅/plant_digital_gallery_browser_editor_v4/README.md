# 万象植境｜植物数字展厅浏览器编辑版 v4

直接用浏览器打开即可查看与编辑，**无需安装 VS Code、Live Server 或任何 .bat 启动脚本**。

## 打开方式

1. 解压文件夹。
2. **双击 `index.html`**（推荐 Chrome 或 Edge）。
3. 首次需要保存时，在右侧「JSON 管理」点击 **「关联项目文件夹」**，选择**含 index.html 的项目根目录**。
4. 之后修改会自动写入 `data/gallery.json`，上传图片自动写入 `assets/`。

> 关联一次后，浏览器会记住该文件夹权限；再次双击 `index.html` 打开即可继续编辑，刷新不丢失。

## 保存说明

| 内容 | 本地路径 |
|---|---|
| 展厅 / 热点 / 文案 | `data/gallery.json`、`data/gallery.boot.js` |
| 全景图上传 | `assets/panoramas/` |
| 展品图上传 | `assets/exhibits/` |
| 音频（可选） | `assets/audio/` |

- JSON 中只保存**相对路径**（如 `panoramas/room_01.jpg`），方便打包部署到云端。
- 媒体根路径可在「项目设置」中配置（默认 `assets/`）。

## 注意

- 请使用 **Chrome 或 Edge** 以获得本地文件夹读写能力。
- 若浏览器询问文件夹权限，请选择「允许」。
- 图片请控制体积；超大全景建议压缩后再上传。
