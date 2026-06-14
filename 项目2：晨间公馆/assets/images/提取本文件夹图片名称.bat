@echo off
chcp 65001 >nul
title 图片文件名提取-交互式加前后缀
cls

echo =====================文件名提取工具=====================
echo 支持格式：jpg jpeg png gif webp bmp
echo ======================================================
echo.

:: 询问前缀
set "qian="
set /p "qian=请输入需要添加的【前缀】(直接回车=不加): "

:: 询问后缀
set "hou="
set /p "hou=请输入需要添加的【后缀】(直接回车=不加): "

echo.
echo 正在生成列表，请稍等...
echo.

:: 写入结果文件
echo 生成时间：%date% %time% > 最终文件名列表.txt
echo 前缀：%qian% >> 最终文件名列表.txt
echo 后缀：%hou% >> 最终文件名列表.txt
echo. >> 最终文件名列表.txt

:: 遍历图片拼接输出
for %%f in (*.jpg,*.jpeg,*.png,*.gif,*.webp,*.bmp) do (
    echo %qian%%%~nxf%hou% >> 最终文件名列表.txt
)

echo ✅ 完成！已在当前文件夹生成：最终文件名列表.txt
pause >nul