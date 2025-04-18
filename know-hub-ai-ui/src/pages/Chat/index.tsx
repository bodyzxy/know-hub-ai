import ChatConversation from '@/component/ChatConversation';
import ChatWindow from '@/component/ChatWindow';
import {
  createChatConversation,
  detailChatConversation,
  listChatConversation,
  removeChatConversation,
} from '@/services/chatConversationController';
import { simpleKnowledgeBase } from '@/services/knowledgeBaseController';
import { uploadChatFile } from '@/services/originFileResourceController';
import { DeleteOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { GetProp, MenuProps, message, Popconfirm, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  CustomEventDataType,
  CustomEventReadyStateChangeType,
  CustomEventType,
  SSE,
  SSEOptionsMethod,
} from 'sse-ts';
import './index.css';
type MenuItem = GetProp<MenuProps, 'items'>[number];
const chatOptions = [
  {
    value: 'simple',
    label: '简单对话',
  },
  {
    value: 'simpleRAG',
    label: '简单RAG对话',
  },
  {
    value: 'multimodal',
    label: '多模态对话',
  },
  {
    value: 'multimodalRAG',
    label: '多模态RAG对话',
  },
];
const ChatPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const { menuCollapsed } = useModel('collapsed');
  const { chatSetting, curConversationId, setCurConverstationId } =
    useModel('chat');
  const [baseOptions, setBaseOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [conversationItem, setConversationItem] = useState<MenuItem[]>([]);
  const [curConversationInfo, setCurConversationInfo] =
    useState<API.ChatConversationVO>({});
  const curConversationInfoRef = useRef<API.ChatConversationVO>({});
  const aiTextRef = useRef('');
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const chatFilesIdsRef = useRef<string[]>([]);

  const removeConversation = async (value: API.ChatConversationVO) => {
    try {
      const res = await removeChatConversation({ ...value });
      if (res.code === 0 && res.data) {
        messageApi.success('删除成功');
      } else {
        messageApi.error(res.message);
      }
    } finally {
      await loadConversationList();
      await loadChatMessage();
    }
  };
  // 加载知识库列表
  const loadSimpleBaseList = async () => {
    try {
      const res = await simpleKnowledgeBase();
      if (res.code === 0 && res.data) {
        // 知识库选项
        const options = res.data.map((item) => ({
          value: item.id ?? '',
          label: item.name ?? '',
        }));
        setBaseOptions(options);
      } else {
        messageApi.error(res.message);
      }
    } catch (e) {
      console.log(e);
    }
  };
  // 加载对话列表
  const loadConversationList = async () => {
    try {
      const res = await listChatConversation();
      if (res.code === 0 && res.data) {
        const items = res.data.map((item) => {
          const menuItem: MenuItem = {
            key: item.id ?? '',
            label: item.title ?? '',
            extra: (
              <Tooltip title="删除对话记录">
                <Popconfirm
                  title="删除记录记录?"
                  description={`这会删除"${item.title}"。`}
                  onConfirm={async () => {
                    await removeConversation(item);
                  }}
                >
                  <DeleteOutlined style={{ color: 'red' }} />
                </Popconfirm>
              </Tooltip>
            ),
            onClick: () => {
              setCurConverstationId(item.id ?? '');
            },
          };
          return menuItem;
        });
        setConversationItem(items);
      } else {
        messageApi.error(res.message);
      }
    } catch (e) {
      console.log(e);
    }
  };
  // 加载对话内容
  const loadChatMessage = async () => {
    try {
      if (curConversationId === '') {
        return;
      }
      const res = await detailChatConversation({
        id: curConversationId,
      });
      if (res.code === 0 && res.data) {
        curConversationInfoRef.current = { ...res.data };
        setCurConversationInfo({ ...curConversationInfoRef.current });
      }
    } catch (e) {
      console.log(e);
    }
  };
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [curConversationInfo.messages]);
  // 初始化执行
  useEffect(() => {
    loadSimpleBaseList();
    loadConversationList();
  }, []);

  useEffect(() => {
    loadChatMessage();
  }, [curConversationId]);

  const handleSendMsg = async (value: string) => {
    if (curConversationId === '') {
      try {
        const res = await createChatConversation({
          title: value,
        });
        if (res.code === 0 && res.data && res.data.id) {
          setCurConverstationId(res.data.id);
          await loadConversationList();
        } else {
          messageApi.error('创建对话失败' + res.message);
        }
      } catch (e) {
        console.log(e);
        messageApi.error('创建对话失败');
        return;
      }
    }
    // 将用户对话列表放到当前聊天信息中
    curConversationInfoRef.current.messages?.push({
      id: '1000000',
      role: 'USER',
      content: value,
    });
    setCurConversationInfo({ ...curConversationInfoRef.current });
    // 动态处理 AI回复的内容
    await handleChat(value);
  };
  const handleChat = async (inputText: string) => {
    aiTextRef.current = '';
    const aiMessage: API.ChatMessageVO = {
      id: '1000001',
      role: 'ASSISTANT',
      content: aiTextRef.current,
    };
    curConversationInfoRef.current.messages?.push(aiMessage);
    setCurConversationInfo({ ...curConversationInfoRef.current });

    // 构造请求对象
    const chatRequest: API.ChatRequestVO = {
      conversationId: curConversationInfoRef.current.id ?? '',
      content: inputText,
      knowledgeIds: chatSetting.knowledgeIds,
      chatType: chatSetting.chatType,
      resourceIds: chatFilesIdsRef.current, // TODO:资源列表
    };

    const source = new SSE(`/api/ai/chat/unify`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      method: SSEOptionsMethod.POST,
      payload: JSON.stringify({
        ...chatRequest,
      }),
    });
    // 事件监听

    source.addEventListener('message', (e: CustomEventType) => {
      const dataEvent = e as CustomEventDataType;
      const data = JSON.parse(dataEvent.data);

      if (data.output && data.output.text !== null) {
        const payload = JSON.parse(dataEvent.data);
        const text = payload.output.text;
        aiTextRef.current = aiTextRef.current + text;
        if (
          curConversationInfoRef.current.messages &&
          curConversationInfoRef.current.messages.length > 0
        ) {
          const updatedMessages = [...curConversationInfoRef.current.messages];
          // 修改content值
          updatedMessages[updatedMessages.length - 1] = {
            ...updatedMessages[updatedMessages.length - 1],
            content: aiTextRef.current,
          };
          // 设置
          curConversationInfoRef.current = {
            ...curConversationInfoRef.current,
            messages: updatedMessages,
          };
        }
        setCurConversationInfo({ ...curConversationInfoRef.current });
      }
    });

    source.addEventListener('readystatechange', (e: CustomEventType) => {
      const dataEvent = e as CustomEventReadyStateChangeType;
      if (dataEvent.readyState >= 2) {
        setCurConversationInfo({ ...curConversationInfoRef.current });
        chatFilesIdsRef.current = [];
      }
    });
    source.stream();
  };

  const handleUploadChatFile = async (file: File) => {
    // 上传文件
    try {
      const res = await uploadChatFile({}, file);
      if (res.code === 0 && res.data) {
        chatFilesIdsRef.current.push(res.data ?? '');
        messageApi.success('文件上传成功');
      } else {
        messageApi.error(res.message);
      }
    } catch (e) {
      console.log(e);
      messageApi.error('文件上传失败');
    }
  };

  return (
    <>
      {contextHolder}
      <PageContainer title={false}>
        <div className="chat-page-box">
          {/* 左边导航栏 */}
          {menuCollapsed && (
            <ChatConversation
              onCreate={() => {
                setCurConverstationId('');
                setCurConversationInfo({});
                loadConversationList();
              }}
              menuItems={conversationItem}
              baseOptions={baseOptions}
              chatOptions={chatOptions}
            />
          )}
          {/* 右边对话界面 */}
          <ChatWindow
            messages={curConversationInfo?.messages}
            onSendMessage={handleSendMsg}
            chatWindowRef={chatWindowRef}
            uploadFile={handleUploadChatFile}
          />
        </div>
      </PageContainer>
    </>
  );
};

export default ChatPage;
