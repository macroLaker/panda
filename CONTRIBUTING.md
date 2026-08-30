# 工程约定

## Dexie 表结构变更（src/db/db.ts）

- **禁止直接修改已发布的 `version(1).stores(...)` 字符串**（会导致老用户升级时 schema 不一致或数据丢失）。
- 任何表结构/索引变更，必须新增版本号并写迁移：

  ```ts
  this.version(2)
    .stores({ /* 新 schema，只需列出有变化的表 */ })
    .upgrade(async (tx) => { /* 把旧数据迁移到新结构 */ })
  ```

- 已有的 `version(1)` 定义永久保留，供老库按链升级。
- 注意 IndexedDB 不能索引布尔值（如 `todos.done`），此类字段用 JS 过滤。

### 发布/回滚约定

- 引入 `version(2)` 之后，生产环境**不允许再部署不包含 v2 定义的旧构建**：用户本地 IndexedDB 一旦升级到 v2，旧代码（只声明到 v1）将无法打开数据库，应用直接不可用。
- 紧急回滚时必须保留全部 version 定义（v1、v2……），只回滚业务逻辑代码。后续新增 version(n) 同理。

## 备份格式演进（src/utils/backup.ts）

- 备份 JSON 携带 `formatVersion` 字段，当前为 `1`。
- 任何对 `BackupFile` 结构的**不兼容改动**必须递增 `formatVersion`，并且：
  1. 把新版本号加入 `SUPPORTED_FORMAT_VERSIONS`；
  2. 在 `importBackup` 中为旧版本文件编写迁移分支，保证老备份仍可导入。
- 不在支持集合内的版本必须明确报错拒绝导入，不允许静默按当前结构解析。
