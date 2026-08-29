# Identity Loom / 身份织网

Local-first identity graph for visualizing accounts, login methods, and binding relationships across platforms.  
一个本地优先的账号关系图谱，用于展示各平台账号、登录方式和绑定关系。

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

