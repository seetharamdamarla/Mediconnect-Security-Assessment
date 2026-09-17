import React, { useEffect, useRef, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import '../styles/Chat.css';
import { AuthContext } from '../context/AuthContext';

const socket = io(process.env.REACT_APP_BACKEND_URL);

const generateRoomId = (a, b) => {
  const [x, y] = [Number(a), Number(b)].sort((u, v) => u - v);
  return `${x}-${y}`;
};

const Chat = () => {
  const { userId: patientUserId } = useContext(AuthContext);
  const [doctors, setDoctors] = useState([]);
  const [chattedDoctorUserIds, setChattedDoctorUserIds] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!patientUserId) return;
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/chatted-doctors`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(setChattedDoctorUserIds)
      .catch(console.error);
  }, [patientUserId]);

  useEffect(() => {
    if (!patientUserId) return;
    const fetchDoctors = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/doctors`, {
          credentials: 'include',
        });
        const data = await res.json();
        setDoctors(data.filter(d => d.user_id !== patientUserId));
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      }
    };
    fetchDoctors();
    const iv = setInterval(fetchDoctors, 10000);
    return () => clearInterval(iv);
  }, [patientUserId]);

  useEffect(() => {
    if (!patientUserId) return;
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/unread?userId=${patientUserId}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => {
        if (typeof data === 'object') setUnreadCounts(data);
      })
      .catch(console.error);
  }, [patientUserId]);

  useEffect(() => {
    if (!selectedDoctor) return;
    const room = generateRoomId(patientUserId, selectedDoctor.user_id);
    socket.emit('join-room', room, patientUserId);
    setUnreadCounts(u => ({ ...u, [room]: 0 }));
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/history/room/${room}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(setMessages)
      .catch(console.error);

    socket.on('receive-message', data => {
      if (data.roomId === room) {
        setMessages(ms => [...ms, data]);
      }
    });
    return () => socket.off('receive-message');
  }, [selectedDoctor, patientUserId]);

  const sendMessage = () => {
    if (!message.trim() || !selectedDoctor) return;
    const doctorUserId = selectedDoctor.user_id;
    const room = generateRoomId(patientUserId, doctorUserId);

    socket.emit('send-message', {
      roomId: room,
      message,
      senderRole: 'patient',
      senderId: patientUserId,
      receiverId: doctorUserId,
    });
    setMessage('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!selectedDoctor) return;
    const room = generateRoomId(patientUserId, selectedDoctor.user_id);
    socket.emit('typing', { roomId: room, senderRole: 'patient' });
  };

  return (
    <div className="chat-container">
      <h2>Chat With a Doctor!</h2>
      <div className="chat-select-wrapper">
        <label htmlFor="doctorSelect">Select Doctor:</label>
        <select
          id="doctorSelect"
          defaultValue=""
          onChange={e => {
            const doc = doctors.find(d => d.user_id === +e.target.value);
            setSelectedDoctor(doc || null);
          }}
        >
          <option value="" disabled>
            -- Choose a doctor --
          </option>
          <optgroup label="Chatted Doctors">
            {doctors
              .filter(d => chattedDoctorUserIds.includes(d.user_id))
              .map(d => {
                const room = generateRoomId(patientUserId, d.user_id);
                return (
                  <option key={d.user_id} value={d.user_id}>
                    Dr. {d.first_name} {d.last_name} – {d.specialization} ({d.address})
                    {unreadCounts[room] > 0 && ` (${unreadCounts[room]})`}
                  </option>
                );
              })}
          </optgroup>
          <optgroup label="🆕 New Doctors">
            {doctors
              .filter(d => !chattedDoctorUserIds.includes(d.user_id))
              .map(d => (
                <option key={d.user_id} value={d.user_id}>
                  Dr. {d.first_name} {d.last_name} – {d.specialization} ({d.address})
                </option>
              ))}

            <option disabled style={{ height: '1.5em' }}></option>
          </optgroup>
        </select>
      </div>

      {selectedDoctor && (
        <>
          <div className="chat-box">
            {messages.map((m, i) => {
              const mine = String(m.sender_id) === String(patientUserId);
              return (
                <div key={i} className={`chat-message-wrapper ${mine ? 'sent' : 'received'}`}>
                  <div className={`chat-bubble ${mine ? 'sent' : 'received'}`}>
                    <div className="chat-sender">{m.sender_role}</div>
                    <div>{m.message}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-wrapper">
            <input
              type="text"
              value={message}
              onChange={e => {
                setMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type your message..."
              className="chat-input"
            />
            <button onClick={sendMessage} className="chat-send-button">
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
