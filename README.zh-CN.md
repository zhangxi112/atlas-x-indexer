# Atlas-X Indexer

**语言：**[English](README.md) | 中文

Atlas-X Indexer 是一个本地优先的桌面索引管理器，用于管理 ChatGPT 对话链接、笔记、标签、项目、保存的筛选器、导入记录和导出记录。当前技术栈为 Tauri 2、React、TypeScript、Tailwind CSS、SQLite、FTS5、Zustand、Zod 和 SheetJS。

## 功能

- 本地 SQLite 数据库和迁移脚本，覆盖条目、标签、项目、保存筛选器、导入/导出日志、应用设置、搜索历史、访问历史和条目历史。
- 仪表盘、条目列表、详情页、新建/编辑表单和设置页。
- 表格视图和卡片视图，支持搜索、排序、分页、日期筛选、状态筛选、项目筛选和标签筛选。
- 批量删除、批量加标签、批量改状态和批量导出。
- CSV、Excel、JSON 导入导出，支持预览、字段映射、重复提示和错误报告导出。
- 设置页支持数据库备份和恢复。
- 支持浅色/深色主题。
- 提供可选浏览器扩展源码，用于把 ChatGPT 页面元数据捕获到桌面应用。

## 项目结构

```text
.
|-- browser-extension/        # 可选捕获扩展源码
|-- scripts/                  # Windows 辅助脚本
|-- src/                      # React 前端
|-- src-tauri/                # Tauri/Rust 后端
|-- tests/                    # Vitest 测试
|-- package.json
|-- package-lock.json
`-- README.md
```

## 环境要求

- Windows 10/11
- Node.js 20+
- Rust stable
- Visual Studio C++ Build Tools 或兼容的 Windows Rust 工具链
- 构建 Windows 安装包时需要 NSIS

开发机器上可能存在 `.tools/`、`.cargo-local/`、`.rustup-local/` 等本地工具链目录。它们已被 Git 忽略，不属于公开源码发布内容。

## 从 Release 安装

发布 GitHub Release 后，下载 Windows 安装包：

```text
Atlas-X Indexer_0.1.0_x64-setup.exe
```

该安装包是 Tauri NSIS 当前用户安装包，预期无需管理员权限即可安装，并创建可运行的 Atlas-X Indexer 桌面应用。

## 本地开发

安装依赖：

```powershell
npm install
```

如果 PowerShell 阻止 `npm.ps1`，使用 `npm.cmd`：

```powershell
npm.cmd install
```

仅运行前端开发服务：

```powershell
npm.cmd run dev
```

运行 Tauri 桌面开发环境：

```powershell
npm.cmd run tauri:dev
```

如果项目路径包含空格，并且本地 GNU 工具链解析路径出错，可以使用 Windows 辅助脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-dev.ps1
```

## 测试和构建

运行前端测试：

```powershell
npm.cmd test
```

构建前端：

```powershell
npm.cmd run build
```

检查 Rust 后端：

```powershell
cd src-tauri
cargo check
```

构建 Windows 应用和 NSIS 安装包：

```powershell
npm.cmd run tauri:build
```

在当前 Windows 开发机器上，也可以使用带路径处理的辅助脚本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-build.ps1
```

## 已验证的本地 Release 构建

当前本地 release 产物为：

```text
src-tauri\target\release\bundle\nsis\Atlas-X Indexer_0.1.0_x64-setup.exe
```

发布前本地验证结果：

- `npm.cmd test`：2 个测试文件通过，9 个测试通过。
- `npm.cmd run build`：TypeScript 和 Vite 生产构建完成。
- 在短路径 `X:\src-tauri` 下使用本机 Windows Rust 工具链执行 `cargo check` 成功。
- 已找到版本 `0.1.0` 的本地 NSIS 安装包产物。

## 数据位置

应用会把 SQLite 数据库保存在 Tauri 应用数据目录。Windows 下通常为：

```text
%APPDATA%\com.atlasx.indexer\atlas-x-indexer.db
```

不要提交本地数据库、数据库备份、包含私人内容的对话导出、浏览器扩展打包密钥或生成的安装包产物。

## 浏览器扩展

扩展源码位于 `browser-extension/atlasx-capture`。扩展打包产物和私钥已被 Git 忽略：

- `browser-extension/*.pem`
- `browser-extension/*.crx`
- `browser-extension/*.zip`

如需使用扩展，请在本地重新打包，不要提交私有打包密钥。

## 许可证

本项目使用 MIT License 发布。见 [LICENSE](LICENSE)。
