# Change Log

## Version 2.0.0: October 4, 2025

* 首次发布 clangd-insight 扩展。
* 支持 C/C++ 代码补全、导航、全局函数引用树状分析。
* 依赖 clangd 语言服务器和 ctags 工具。
* 可在侧边栏以树视图展示全局函数及其引用，点击可跳转。
* 新增配置项 `ci.ctagPath`，用于指定 ctags 可执行文件路径。
* 兼容 Windows/Linux/Mac。
* 详细功能和配置请参考 README。
