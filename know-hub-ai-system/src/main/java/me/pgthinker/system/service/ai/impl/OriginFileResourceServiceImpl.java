package me.pgthinker.system.service.ai.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.pgthinker.core.common.CoreCode;
import me.pgthinker.core.exception.BusinessException;
import me.pgthinker.core.service.objectstore.ObjectStoreService;
import me.pgthinker.core.service.objectstore.StorageFile;
import me.pgthinker.core.utils.FileUtil;
import me.pgthinker.system.mapper.DocumentEntityMapper;
import me.pgthinker.system.mapper.OriginFileResourceMapper;
import me.pgthinker.system.model.entity.ai.DocumentEntity;
import me.pgthinker.system.model.entity.ai.OriginFileResource;
import me.pgthinker.system.model.entity.user.SystemUser;
import me.pgthinker.system.service.ai.LLMService;
import me.pgthinker.system.service.ai.OriginFileResourceService;
import me.pgthinker.system.utils.SecurityFrameworkUtil;
import org.springframework.ai.document.Document;
import org.springframework.ai.model.Media;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
* @author pgthinker
* @description 针对表【origin_file_source(存储原始文件资源的表)】的数据库操作Service实现
* @createDate 2025-04-08 04:47:02
*/
@Slf4j
@Service
@RequiredArgsConstructor
public class OriginFileResourceServiceImpl extends ServiceImpl<OriginFileResourceMapper, OriginFileResource>
    implements OriginFileResourceService {

    public static final String CHAT_BUCKET_NAME = "OriginFile";
    public static final String KNOWLEDGE_BUCKET_NAME = "KnowledgeFile";

    private final ObjectStoreService objectStoreService;
    private final DocumentEntityMapper documentEntityMapper;
    private final TokenTextSplitter tokenTextSplitter;
    private final LLMService llmService;

    @Override
    public List<Media> fromResourceId(List<String> resourceIds) {
        return List.of();
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public String uploadFile(MultipartFile file) {
        OriginFileResource upload = this.upload(file,CHAT_BUCKET_NAME);
        return upload.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public Long uploadFile(MultipartFile file, String knowledgeId) {
        Resource resource = file.getResource();
        // 1. 先上传文件至MinIO
        OriginFileResource upload = this.upload(file,KNOWLEDGE_BUCKET_NAME);
        // 2. 存储到数据库
        DocumentEntity documentEntity = new DocumentEntity();
        documentEntity.setFileName(file.getOriginalFilename());
        documentEntity.setBaseId(knowledgeId);
        documentEntity.setPath(upload.getPath());
        documentEntity.setIsEmbedding(false);
        documentEntityMapper.insert(documentEntity);
        // 3. 向量化
        TikaDocumentReader tikaDocumentReader = new TikaDocumentReader(resource);
        List<Document> rawDocumentList = tikaDocumentReader.read();
        List<Document> splitDocumentList = tokenTextSplitter.split(rawDocumentList);
        List<Document> hasMetaDocumentList = splitDocumentList.stream().map(item -> {
            Map<String, Object> metadata = item.getMetadata();
            metadata.put("user_id", SecurityFrameworkUtil.getCurrUserId());
            metadata.put("knowledge_base_id", knowledgeId);
            metadata.put("document_id", documentEntity.getId());
            return new Document(item.getText(), metadata);
        }).toList();
        VectorStore vectorStore = llmService.getVectorStore();
        vectorStore.accept(hasMetaDocumentList);
        // 4. 更新
        documentEntity.setIsEmbedding(true);
        documentEntityMapper.updateById(documentEntity);

        return documentEntity.getId();
    }

    private String objectNameWithUserId(String filename) {
        SystemUser loginUser = SecurityFrameworkUtil.getLoginUser();
        return loginUser.getId() + "/" + UUID.randomUUID().toString().replace("-", "") + "-" + filename;
    }

    private OriginFileResource upload(MultipartFile file, String bucketName) {
        String originalFilename = file.getOriginalFilename();
        String objectName = objectNameWithUserId(originalFilename);
        String id = FileUtil.generatorFileId(bucketName, objectName);
        String newObjectName = String.format("%s/%s", id, objectName);
        String path;
        String md5;
        try {
            md5 = FileUtil.md5(file.getResource().getFile());
            path = objectStoreService.uploadFile(file, bucketName, newObjectName);
        }catch (IOException e) {
            throw new BusinessException(CoreCode.SYSTEM_ERROR, e.getMessage());
        }
        StorageFile fileInfo = objectStoreService.getFileInfo(bucketName, newObjectName);
        OriginFileResource originFileResource = new OriginFileResource();
        originFileResource.setMd5(md5);
        originFileResource.setFileName(originalFilename);
        originFileResource.setPath(path);
        originFileResource.setId(fileInfo.getId());
        originFileResource.setBucketName(bucketName);
        originFileResource.setObjectName(newObjectName);
        originFileResource.setIsImage(file.getContentType() != null && file.getContentType().startsWith("image"));
        originFileResource.setSize(fileInfo.getSize());
        originFileResource.setContentType(fileInfo.getContentType());
        this.saveOrUpdate(originFileResource);
        return originFileResource;
    }


}




