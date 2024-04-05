import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('서버 주소', {
    query: { userId: '사용자ID' },
});

function ChatApp() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on('private message', ({ from, msg }) => {
            setMessages((prevMessages) => [...prevMessages, { from, msg }]);
        });

        return () => {
            socket.off('private message');
        };
    }, []);

    const sendMessage = () => {
        socket.emit('private message', { receiverId: '상대방ID', msg: message });
        setMessage('');
    };

    return (
        <div>
            {messages.map((msg, index) => (
                <div key={index}>{`${msg.from}: ${msg.msg}`}</div>
            ))}
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
}

export default ChatApp;
