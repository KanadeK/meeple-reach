# MeepleReach

MeepleReach 是一个本地运行的实体桌游组件可达性审计与精确布局规划器。它读取桌面尺寸、固定玩家锚点、参与者自行测量的舒适触达半径、组件、交互频率和候选位置，穷举所有无碰撞离散布局，并输出可复验的 JSON、CSV、SVG 与离线 HTML。

[在线演示](https://kanadek.github.io/meeple-reach/) · [英文 README](README.md) · [完整规格](docs/SPEC.md)

它不会分配玩家座位、推断疾病或残障，也不声称满足医疗或法规标准。

## 快速开始

需要 Node.js 22 或 24：

```powershell
git clone https://github.com/KanadeK/meeple-reach.git
Set-Location meeple-reach
npm ci
node .\bin\meeple-reach.js audit .\samples\cooperative-table.json
node .\bin\meeple-reach.js plan .\samples\cooperative-table.json --out .\plan --fail-on-barrier
```

示例的当前布局有 4 对交互超出舒适触达距离。规划器移动 4 个共享组件，并在声明的候选位置范围内证明零阻塞方案最优。

输出包括：

- `plan.json`：输入、分配、指标与搜索完成证据；
- `interactions.csv`：逐个玩家/组件交互数据；
- `layout.svg`：可缩放桌面图；
- `report.html`：无需服务器即可打开的完整报告。

## 一键验收

```powershell
npm ci
npm run check
```

它会执行全部测试、构建网页演示、运行有效/规划路径、打 npm 包、安装到隔离的消费者目录，再运行安装后的 CLI。最后必须出现：

```text
MEEPLE_REACH_CHECK=PASS
```

## 命令与退出码

```text
meeple-reach validate INPUT
meeple-reach audit INPUT [--format text|json] [--fail-on-barrier]
meeple-reach plan INPUT --out DIR [--max-search-nodes N] [--fail-on-barrier] [--force]
meeple-reach demo --out DIR [--force]
```

- `0`：成功；
- `1`：未预期的运行时错误，会打印堆栈；
- `2`：输入、用法或输出边界错误；
- `3`：启用门禁后仍有触达阻塞；
- `4`：搜索节点预算耗尽，未证明最优且不会写计划产物；
- `5`：不存在无碰撞分配。

对应的真实复现命令和修复办法见[测试与故障修复](docs/TESTING.md)，输入字段见[格式说明](docs/INPUT_FORMAT.md)，目标函数见[算法说明](docs/ALGORITHM.md)。

## 诚实边界

“精确”只针对你提供的离散候选位置。v0.1 不计算任意连续摆放、旋转、三维遮挡、手部运动路径、疲劳或法规合规。零阻塞只表示：所有已声明交互的组件中心点距离不超过该参与者自己提供的舒适触达半径。

MIT © 2026 KanadeK
