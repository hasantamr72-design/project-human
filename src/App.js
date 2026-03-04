import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function UltimateChat() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState("🥉 Bronze");
  const [bannedUsers, setBannedUsers] = useState([]);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    signInAnonymously(auth);
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(newMessages);
      const audio = new Audio("https://actions.google.com/sounds/v1/notifications/notification_simple-01.mp3");
      audio.play();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (username) {
      const userRef = doc(db, "users", username);
      getDoc(userRef).then(docSnap => {
        if(docSnap.exists()){
          const data = docSnap.data();
          setXp(data.xp);
          setLevel(data.level);
          setPoints(data.points);
          setFriends(data.friends || []);
        } else {
          setDoc(userRef, { xp: 0, level: 1, points: 0, friends: [] });
        }
      });
    }
  }, [username]);

  useEffect(() => {
    if(username){
      const userRef = doc(db, "users", username);
      updateDoc(userRef, { xp: xp, level: level, points: points });
    }
    if (xp >= 500) {
      const lvlUp = Math.floor(xp / 500);
      setLevel(prev => prev + lvlUp);
      setXp(xp % 500);
      setPoints(prev => prev + lvlUp * 50);
    }
    if (level >= 50) setRank("💎 Diamond");
    else if (level >= 30) setRank("🥇 Gold");
    else if (level >= 15) setRank("🥈 Silver");
    else setRank("🥉 Bronze");
  }, [xp, level, points, username]);

  if (bannedUsers.includes(username)) {
    return <div style={{color:"red",fontSize:"30px",textAlign:"center"}}>🚫 You Are Banned</div>;
  }

  if (!loggedIn) {
    return (
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#2563eb"}}>
        <div style={{background:"white",padding:"30px",borderRadius:"20px"}}>
          <h2>Ultimate 💬</h2>
          <input placeholder="Enter PIN" maxLength={4} value={pin} onChange={(e)=>setPin(e.target.value)} />
          <input placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} />
          <input placeholder="Profile Image URL" value={avatar} onChange={(e)=>setAvatar(e.target.value)} />
          <button onClick={()=>{
            if(pin === "000") setLoggedIn(true);
            if(pin === "9999"){ setLoggedIn(true); setIsAdmin(true); }
          }}>Login</button>
        </div>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!message.trim()) return;
    const words = message.trim().split(/\s+/).length;
    setXp(prev => prev + words * 100);
    await addDoc(collection(db, "messages"), {
      text: message,
      user: username,
      avatar: avatar,
      createdAt: new Date()
    });
    setMessage("");
  };

  const deleteMessage = async (id) => { await deleteDoc(doc(db, "messages", id)); };
  const banUser = (user) => { setBannedUsers([...bannedUsers, user]); };
  const addFriend = async (friendName) => {
    const userRef = doc(db, "users", username);
    setFriends([...friends, friendName]);
    await updateDoc(userRef, { friends: arrayUnion(friendName) });
  };
  const buyXPBoost = () => { if(points >= 100){ setPoints(points - 100); setXp(xp + 500); } };

  return (
    <div style={{background:"#eff6ff",minHeight:"100vh",padding:"20px"}}>
      <h1 style={{background:"#2563eb",color:"white",padding:"15px"}}>Ultimate 💬</h1>
      <div style={{display:"flex",gap:"20px"}}>
        <div style={{flex:2,background:"white",padding:"15px"}}>
          <div style={{height:"300px",overflowY:"auto"}}>
            {messages.map((msg)=>(
              <div key={msg.id} style={{borderBottom:"1px solid #ddd",marginBottom:"5px"}}>
                {msg.avatar && <img src={msg.avatar} width="30" height="30" style={{borderRadius:"50%"}} alt="" />} 
                <strong>{msg.user}</strong>: {msg.text}
                {isAdmin && (<><button onClick={()=>banUser(msg.user)}> 🚫 </button><button onClick={()=>deleteMessage(msg.id)}> 🗑 </button></>)}
              </div>
            ))}
          </div>
          <input maxLength={200} value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Write message..." />
          <button onClick={sendMessage}>Send 🚀</button>
        </div>
        <div style={{flex:1,background:"white",padding:"15px"}}>
          <h3>👤 Profile</h3>
          {avatar && <img src={avatar} width="60" height="60" style={{borderRadius:"50%"}} alt="" />}
          <p>Level: {level}</p><p>XP: {xp}/500</p><p>Rank: {rank}</p><p>Points: {points}</p><p>Friends: {friends.join(", ")}</p>
          <h4>🛒 Shop</h4><button onClick={buyXPBoost}>Buy XP Boost (100 Points)</button>
          <h4>➕ Add Friend</h4><input placeholder="Friend Name" id="friendInput" /><button onClick={()=>addFriend(document.getElementById('friendInput').value)}>Add Friend</button>
        </div>
      </div>
    </div>
  );
}