import { OpenAIOutlined } from '@ant-design/icons';
import { LegacyRef } from 'react';
import ChatMessage from '../ChatMessage';
import './index.css';
interface Props {
  messages: API.ChatMessageVO[] | undefined;
  chatWindowRef: LegacyRef<any>;
}
const ChatList = (props: Props) => {
  return (
    <>
      <div className="chat-window-container" ref={props.chatWindowRef}>
        {props.messages && props.messages.length > 0 ? (
          props.messages.map((item) => {
            return (
              <ChatMessage
                key={item.id}
                role={item.role ?? ''}
                content={item.content ?? ''}
              />
            );
          })
        ) : (
          <div className="chat-window-empty-box">
            <OpenAIOutlined />
            <span>How can I help you?</span>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatList;
