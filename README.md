# clangd-insight

本扩展基于 [clangd](https://clangd.llvm.org) 实现，提供 C/C++ 代码补全、导航、引用分析等功能。

## 依赖说明

- 需要安装并配置 [clangd](https://clangd.llvm.org) 语言服务器。
- 需要在 VSCode 设置中配置 `ctags` 可执行文件路径（如 `ci.ctagPath`），用于全局函数引用分析。
  - 示例：
    ```json
    "ci.ctagPath": "/usr/bin/ctags"
    ```
  - Windows 用户可配置为 `ctags.exe` 的绝对路径。

## 主要功能

- 支持模仿 Source Insight 的全局函数引用搜索。
- 通过 ctags 分析项目源码，结合 clangd 提供的语义信息，实现树状结构展示所有函数及其引用。
- 在边栏以树视图展示函数引用，点击可跳转到具体位置。

## 配置方法

1. 安装 clangd 语言服务器并确保其可用。
2. 安装本扩展。
3. 在 VSCode 设置中添加或修改 `ci.ctagPath`，指向你的 ctags 可执行文件。
4. 打开 C/C++ 项目后，使用扩展提供的引用树功能，即可全局搜索和跳转函数引用。

## 其他说明

- 本扩展依赖 clangd 提供的语义能力，ctags 仅用于补充全局函数范围分析。
