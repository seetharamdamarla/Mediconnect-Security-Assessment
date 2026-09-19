import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import '../styles/Chat.css';
import { AuthContext } from '../context/AuthContext';

const socket = io(process.env.REACT_APP_BACKEND_URL);

const generateRoomId = (a, b) => {
  const [x, y] = [Number(a), Number(b)].sort((u, v) => u - v);
  return `${x}-${y}`;
};

const DoctorChat = () => {
  const { userId: doctorUserId, loading } = useContext(AuthContext);
  const [patients, setPatients] = useState([]);
  const [chattedPatientIds, setChattedPatientIds] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [patientTyping, setPatientTyping] = useState(false);
  const bottomRef = useRef(null);

  const fetchChatted = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/chatted-patients`, {
        credentials: 'include',
      });
      setChattedPatientIds(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/patients`, {
        credentials: 'include',
      });
      const data = await res.json();
      setPatients(data.filter(p => p.user_id !== doctorUserId));
    } catch (e) {
      console.error(e);
    }
  }, [doctorUserId]);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/chat/unread?userId=${doctorUserId}`,
        { credentials: 'include' }
      );
      const map = await res.json();
      if (typeof map === 'object') setUnreadCounts(map);
    } catch (e) {
      console.error(e);
    }
  }, [doctorUserId]);

  useEffect(() => {
    if (!doctorUserId) return;
    fetchPatients();
    fetchChatted();
    fetchUnread();
    const iv = setInterval(() => {
      fetchPatients();
      fetchChatted();
      fetchUnread();
    }, 4000);
    return () => clearInterval(iv);
  }, [doctorUserId, fetchPatients, fetchChatted, fetchUnread]);

  useEffect(() => {
    if (!selectedPatient) return;
    const room = generateRoomId(doctorUserId, selectedPatient.user_id);
    socket.emit('join-room', room, doctorUserId);
    setUnreadCounts(u => ({ ...u, [room]: 0 }));
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/history/room/${room}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(setMessages)
      .catch(console.error);

    socket.on('receive-message', data => {
      if (data.roomId === room) setMessages(ms => [...ms, data]);
      fetchUnread();
      fetchChatted();
      fetchPatients();
    });
    socket.on('typing', data => {
      if (data.roomId === room && data.senderRole === 'patient') {
        setPatientTyping(true);
        setTimeout(() => setPatientTyping(false), 2000);
      }
    });
    return () => {
      socket.off('receive-message');
      socket.off('typing');
    };
  }, [selectedPatient, doctorUserId, fetchUnread, fetchChatted, fetchPatients]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!selectedPatient) return;
    const room = generateRoomId(doctorUserId, selectedPatient.user_id);
    socket.emit('typing', { roomId: room, senderRole: 'doctor' });
  };

  const sendMsg = () => {
    if (!draft.trim() || !selectedPatient) return;
    const room = generateRoomId(doctorUserId, selectedPatient.user_id);
    socket.emit('send-message', {
      roomId: room,
      message: draft,
      senderRole: 'doctor',
      senderId: doctorUserId,
      receiverId: selectedPatient.user_id,
    });
    setDraft('');
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div className="chat-container">
      <h2>Chat with Your Patients!</h2>
      <div className="chat-select-wrapper">
        <label htmlFor="patientSelect">Select Patient:</label>
        <select
          id="patientSelect"
          defaultValue=""
          onChange={e => {
            const p = patients.find(x => x.user_id === +e.target.value);
            setSelectedPatient(p || null);
          }}
        >
          <option value="" disabled>
            -- Choose a patient --
          </option>
          <optgroup label="Chatted Patients">
            {patients
              .filter(p => chattedPatientIds.includes(p.user_id))
              .map(p => {
                const room = generateRoomId(doctorUserId, p.user_id);
                return (
                  <option key={p.user_id} value={p.user_id}>
                    {p.patient_name}
                    {unreadCounts[room] > 0 && ` (${unreadCounts[room]})`}
                  </option>
                );
              })}
          </optgroup>
          <optgroup label="🆕 New Patients">
            {patients
              .filter(p => !chattedPatientIds.includes(p.user_id))
              .map(p => (
                <option key={p.user_id} value={p.user_id}>
                  {p.patient_name}
                </option>
              ))}

            <option disabled style={{ height: '1.5em' }}></option>
          </optgroup>
        </select>
      </div>

      {selectedPatient && (
        <>
          {patientTyping && (
            <div className="typing-indicator">
              <em>Patient is typing…</em>
            </div>
          )}
          <div className="chat-box">
            {messages.map((m, i) => {
              const mine = String(m.sender_id) === String(doctorUserId);
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
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                handleTyping();
              }}
              placeholder="Type your message..."
              className="chat-input"
            />
            <button onClick={sendMsg} className="chat-send-button">
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DoctorChat;
