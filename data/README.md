# data / 数据目录

本项目的数据分为两类：

## 1. 示例数据（可提交到 git）

- `samples/sample_graph.json` —— 脱敏示例图，仅用于演示和测试。
- `frontend/src/sampleData.js` —— 前端内置的示例图（无真实信息）。

这些文件**不包含任何真实账号信息**，可以放心提交。

## 2. 私有数据（绝不提交到 git）

真实账号、手机号、邮箱、密码等信息放在：

```
data/private/
```

该目录已通过 `.gitignore` 中的 `data/private/` 规则忽略，**git 不会跟踪它**。

### 数据格式

在 `data/private/` 下放一个或多个 `.json` 文件（也可用 `.csv`），
后端启动时会自动读取并导入 Neo4j：

```json
{
  "nodes": [
    { "id": "you", "kind": "you", "name": "YOU" },
    { "id": "phone_1", "kind": "identifier", "name": "Phone 1", "phone": "13800000001" },
    { "id": "acc_1", "kind": "account", "name": "Google Account A", "platform": "Google", "username": "you@example.com" }
  ],
  "relationships": [
    { "id": "r1", "source": "you", "target": "acc_1", "relation_type": "owns" },
    { "id": "r2", "source": "acc_1", "target": "phone_1", "relation_type": "binds" }
  ]
}
```

### 安全提醒

- 私有目录里可以记录密码等敏感信息，但**仅限本地个人使用**，请勿分享或上传。
- 提交前务必确认 `git status` 中不出现 `data/private/`。
- 真实数据导入后存储在 `neo4j/data/`（同样被 git 忽略），不会进入版本库。
