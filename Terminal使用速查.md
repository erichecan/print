# Terminal 使用速查

**创建时间**: 2025-01-23  
**用途**: Cursor IDE 中 Terminal 的快速参考

---

## 📋 打开 Terminal

### 快捷键

| 系统 | 快捷键 |
|------|--------|
| Windows/Linux | `Ctrl + `` (反引号键) |
| macOS | `Cmd + `` |

### 菜单方式

1. 点击顶部菜单：`View` → `Terminal`
2. Terminal 会出现在底部面板

### 命令面板方式

1. 按 `Ctrl + Shift + P` (macOS: `Cmd + Shift + P`)
2. 输入：`Terminal: Create New Terminal`
3. 回车

---

## 🔍 常用命令

### 文件操作

#### 查看文件列表

```bash
# Windows PowerShell
Get-ChildItem        # 详细列表
Get-ChildItem -Name  # 仅文件名

# Windows CMD
dir                  # 详细列表
dir /B               # 仅文件名

# macOS/Linux
ls                   # 详细列表
ls -l                # 长格式
ls -a                # 包括隐藏文件
```

#### 切换目录

```bash
cd                  # 返回主目录
cd ..               # 上一级目录
cd /path/to/folder  # 进入指定目录
cd Desktop/print    # 进入相对路径
```

#### 创建文件/目录

```bash
# 创建目录
mkdir assets

# 创建文件
touch styles.css       # macOS/Linux
New-Item styles.css    # Windows PowerShell
type nul > styles.css  # Windows CMD
```

---

### Web 开发常用命令

#### 启动本地服务器

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (需要安装 http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

**访问**: http://localhost:8000

**停止服务器**: 按 `Ctrl + C`

#### 检查 Node.js/Python 版本

```bash
# Node.js
node --version

# Python
python --version

# npm
npm --version
```

---

### Git 版本控制

```bash
# 初始化仓库
git init

# 查看状态
git status

# 添加文件
git add index.html
git add .              # 添加所有文件

# 提交
git commit -m "复刻 CustomInk 首页"

# 查看历史
git log
```

---

### 测试和调试

#### 检查语法错误

```bash
# 如果没有安装工具，可以：
# 1. 在浏览器中打开 DevTools Console
# 2. 或在 Cursor 中使用 AI 分析代码
```

#### 查看文件内容

```bash
# Windows PowerShell
Get-Content index.html

# Windows CMD
type index.html

# macOS/Linux
cat index.html
less index.html       # 分页查看
head -n 20 index.html # 查看前 20 行
```

---

## 🛠️ 实用技巧

### 自动补全

- 按 `Tab` 键自动补全命令和文件名
- 连续按 `Tab` 两次查看所有可能

### 命令历史

- 按 `↑` 键查看上一个命令
- 按 `↓` 键查看下一个命令
- 按 `Ctrl + R` 搜索历史命令

### 清屏

```bash
clear               # macOS/Linux
cls                 # Windows
```

### 中断命令

- 按 `Ctrl + C` 中断正在运行的命令

---

## 📁 路径说明

### Windows

```bash
# 当前目录
.\index.html

# 上级目录
..\..\folder

# 绝对路径
C:\Users\eric\Desktop\print\index.html
```

### macOS/Linux

```bash
# 当前目录
./index.html

# 上级目录
../../folder

# 绝对路径
/Users/eric/Desktop/print/index.html

# 主目录
~/Desktop/print
```

---

## ⚠️ 常见问题

### Q: 找不到 Python 命令？

**Windows**:
1. 检查 Python 是否安装
2. 可能需要使用 `python3` 或 `py` 代替 `python`

**macOS**:
```bash
# 安装 Homebrew (如果没有)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Python
brew install python
```

**Linux**:
```bash
sudo apt update
sudo apt install python3
```

---

### Q: 找不到命令？

**可能原因**：
1. 命令拼写错误
2. 软件未安装
3. 环境变量未配置

**解决方法**：
- 检查拼写
- 使用 `which` 或 `where` 查找命令位置
- 重新安装软件

---

### Q: 权限不足？

**Windows**:
- 右键 Cursor → "以管理员身份运行"

**macOS/Linux**:
```bash
# 使用 sudo (需要密码)
sudo command

# 修改文件权限
chmod +x script.sh
```

---

## 🎯 本项目的 Terminal 命令

### 启动开发

```bash
# 1. 打开 Terminal (Ctrl + `)
# 2. 启动服务器
python -m http.server 8000

# 3. 在浏览器中打开
# http://localhost:8000
```

### 停止服务器

```bash
# 按 Ctrl + C
```

### 查看文件

```bash
# 列出所有文件
dir                # Windows
ls                 # macOS/Linux

# 查看 README
Get-Content README.md        # Windows
cat README.md                # macOS/Linux
```

---

## 📚 学习资源

- [Bash 基础教程](https://linuxconfig.org/bash-basics)
- [PowerShell 学习中心](https://docs.microsoft.com/powershell/)
- [Terminal 命令速查表](https://cheatography.com/davechild/cheat-sheets/unix-linux-command-cheat-sheet/)

---

**提示**: 如果遇到问题，在 Cursor 聊天中输入错误信息，AI 会帮你解决！









