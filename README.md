# Identity Loom / 身份织网

Local-first identity graph for visualizing accounts, login methods, and binding relationships across platforms.  
一个本地优先的账号关系图谱，用于展示各平台账号、登录方式和绑定关系。

## Screenshots / 页面展示

> Save screenshots under `docs/images/` with the suggested filenames below — they will render automatically.
> 把截图放到 `docs/images/` 目录并使用下面建议的文件名，即可自动显示。

### Graph overview / 关系图谱总览

The core view around the `YOU` node — platforms, accounts, and binding relationships laid out as an interactive force graph. Click a node to smoothly center it.
围绕 `YOU` 核心节点的主视图，平台、账号与绑定关系以可交互的力导向图谱呈现，点击节点可平滑移动到中心。

![Graph overview](docs/images/01-graph-overview.png)

### Node detail & inline editing / 节点详情与内联编辑

The white detail panel on the right shows every field of a node. Click ✎ to edit directly inside the panel — no separate dialog; right-click a node for edit / delete actions.
右侧白色详情面板展示节点的全部字段，点击 ✎ 即可在面板内直接编辑，无需单独弹窗；右键节点可进行编辑 / 删除。

![Node detail and editing](docs/images/02-node-detail-edit.png)

### Add node & relationship / 新增节点与关系

Add nodes on the fly while creating a relationship, so new accounts can be linked without creating them separately first.
在新增关系时可直接内联新增节点，新账号无需提前单独创建即可建立关联。

![Add node and relationship](docs/images/03-add-node-relationship.png)

### Search & focus / 搜索与定位

Search by name, ID, or platform to quickly locate any node and smoothly move it into focus.
支持按名称、ID 或平台搜索，快速定位任意节点并平滑聚焦。

![Search and focus](docs/images/04-search-focus.png)

### Data import / 数据导入

Bulk-load data through JSON or CSV import, with real account data kept out of git.
通过 JSON 或 CSV 导入批量录入数据，真实账号数据不会进入 git。

![Data import](docs/images/05-data-import.png)

## Stack / 技术栈

- Frontend / 前端: React + D3.js
- Backend / 后端: FastAPI
- Storage / 存储: Neo4j
- Runtime / 运行方式: Docker Compose

## What it does / 功能

- Record many accounts per platform / 记录同一平台下的多个账号
- Show relationship graph around `YOU` / 围绕 `YOU` 展示关系图
- Support manual entry, JSON import, and CSV import / 支持手动录入、JSON 导入和 CSV 导入
- Keep private data out of git / 私有数据不进入 git

## Privacy / 隐私

Real account data lives under `data/private/` and is ignored by git.  
真实账号数据放在 `data/private/` 下，并且已被 git 忽略。

## Run / 运行

```bash
docker compose up --build
```

Then open / 然后打开:

- Frontend / 前端: http://localhost:5173
- API / 接口: http://localhost:8000
- Neo4j UI / Neo4j 页面: http://localhost:7474

## CSV import / CSV 导入

Use a combined CSV with a `record_type` column.  
使用带有 `record_type` 列的合并 CSV 文件。

```csv
record_type,id,kind,name,source,target,relation_type,label,phone,email,username
node,you,you,YOU,,,,,,,
node,google,provider,Google,,,,,,,
relationship,rel_1,,,,you,google,owns,owns,,,
```

