package me.pgthinker.system.service.ai;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;

/**
 * @Project: me.pgthinker.service.doc
 * @Author: NingNing0111
 * @Github: https://github.com/ningning0111
 * @Date: 2025/3/30 03:06
 * @Description:
 */
public interface LLMService {

	/**
	 * 获取对话模型
	 * @return
	 */
	ChatModel getChatModel();

	/**
	 * 获取超长上下文对话模型
	 * @return
	 */
	ChatModel getLongContextChatModel();

	/**
	 * 获取多模态对话模型
	 * @return
	 */
	ChatModel getMultimodalModel();

	/**
	 * 向量化模型
	 * @return
	 */
	EmbeddingModel getEmbeddingModel();

	/**
	 * 获取向量存储对象
	 * @return
	 */
	VectorStore getVectorStore();

}
