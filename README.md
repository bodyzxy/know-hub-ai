# 说明

&emsp;使用SpringAI 1.x版本对项目进行重构：

- 前端：React + Umi.js
- 后端：SpringAI 1.x

功能集中实现实现知识库分离，文档分离，支持指定某个知识库进行RAG对话、多模态对话。


## TODO 

### 后端工作

- [ ] 对话附件上传接口：多模态需要。文档或图片上传时返回id，携带该id发起对话，Media 在后端根据id构建。
- [ ] `DatabaseChatMemory` 实现：Message 存储到数据库中
- [ ] 知识库增删改查接口：添加知识库、删除知识库、知识库列表
- [ ] 知识库附件上传接口：指定知识库（携带id）上传，将文档存储到向量数据库（meta记录知识库id-baseId），同时生成附件文档对象。
- [ ] 知识库下的附件文档删查接口：在指定知识库下，可以删除附件、查询附件。
- [ ] 对话信息接口：创建对话、查询对话信息
- [ ] RAG对话: 指定多个知识库进行对话

### 前端工作

- [ ] 对话界面: assistant ui 快速搭建
- [ ] 知识库管理界面
- [ ] 知识库下附件管理界面

## 开发流程

> 重构代码均在new分支上，待开发完毕才会合并到master上。

- fork整个项目，包含new分支
- 拉去项目:`git clone -b new 仓库地址`

