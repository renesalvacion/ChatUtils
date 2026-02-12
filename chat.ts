interface SdpDto {
  Type: RTCSdpType;
  Sdp: string;
}

interface IceCandidateDto {
    Candidate: string;
    SdpMid?: string | null;
    SdpMLineIndex?: number | null;
}




import { defineStore } from 'pinia'
import axios from 'axios'
import * as signalR from '@microsoft/signalr'
import { useSessionStore } from '#imports'



export const useMessengerStore = defineStore('chat', {
  state: () => ({
    openChats: [] as {
      partnerId: number
      messages: any[]
      isOpen: boolean
      unread: number
      page: number
      total: number
    }[],
    connection: null as signalR.HubConnection | null,
        // Add this:
    remoteStream: null as MediaStream | null,
    iceQueue: [] as RTCIceCandidateInit[],



  // 📞 CALL STATE
  peer: null as RTCPeerConnection | null,
  localStream: null as MediaStream | null,
  inCall: false,
  currentCallUserId: null as number | null,

  currentCallId: null as number | null,      // 🔹 store CallId
  callStartTime: 0 as number,   

  
  // New UI state flags
  showCallScreen: false,          // true when the call screen should show
  showIncomingCallModal: false,   // true when callee sees modal
 
  // store incoming offer along with call info
  incomingCall: null as { 
    fromUserId: number; 
    video: boolean; 
    offer?: RTCSessionDescriptionInit 
  } | null,

  callErrors: [] as string[], // store error logs from Hub

  }),

    getters:{
      apiUrl : () => {
        const config = useRuntimeConfig()
        return config.public.chatApi
      }
    },
  actions: {


    /** ----------------------
     * TEXT MESSAGES
     * ---------------------- */
async viewMessagePerson(userId: number, partnerId: number) {
  let chat = this.openChats.find(c => c.partnerId === partnerId)

  if (!chat) {
    // Mark as open immediately
    chat = {
      partnerId,
      messages: [],
      isOpen: true, // ✅ set true here
      unread: 0,
      page: 1,
      total: 0
    }

    // Add to reactive array
    this.openChats = [...this.openChats, chat]
    await nextTick() // let Vue react
  } else {
    chat.isOpen = true // for existing chats
  }

  chat.unread = 0
  await this.autoInit()

  const token = localStorage.getItem('token')
  const res = await axios.get(
    `${this.apiUrl}/api/chat/view-person-message/${userId}/${partnerId}?page=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  chat.messages.splice(0, chat.messages.length, ...res.data.messages)
  chat.total = res.data.totalMessages
  chat.page = 1

  return chat.messages
},

    async loadOlderMessages(partnerId: number, userId: number) {
      const chat = this.openChats.find(c => c.partnerId === partnerId)
      if (!chat || chat.messages.length >= chat.total) return

      const token = localStorage.getItem('token')
      const nextPage = chat.page + 1
      const res = await axios.get(
        `${this.apiUrl}/api/chat/view-person-message/${userId}/${partnerId}?page=${nextPage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      chat.messages = [...res.data.messages, ...chat.messages]
      chat.page = nextPage
chat.isOpen = true

    },

closeChat(partnerId: number) {
  const chat = this.openChats.find(c => c.partnerId === partnerId)
  if (chat) chat.isOpen = false

  // ❌ DO NOT STOP SIGNALR IF CALL IS ACTIVE
  if (this.inCall) return
},

async autoInit() {
  if (!this.connection) await this.initSignalR()
  
  // ⚡ Wait until SignalR is fully connected
  if (this.connection && this.connection.state !== signalR.HubConnectionState.Connected) {
    await this.connection.start()
    console.log('✅ SignalR connection is ready inside autoInit')
  }
},

    async initSignalR() {
      if (this.connection) return
      const sessionStore = useSessionStore()
      const userId = sessionStore.getSession()?.userId
      const token = localStorage.getItem('token')
      if (!userId || !token) return

      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`${this.apiUrl}/hubs/messenger`, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build()



this.connection.on('ReceiveOffer', async (offerPayload: any, fromUserId: number) => {
  console.log('Offer received:', offerPayload)

  if (!offerPayload.sdp) {
    console.warn('Received offer has no SDP, ignoring.')
    return
  }

  this.incomingCall = {
    fromUserId,
    video: offerPayload.sdp.includes('m=video'),
    offer: {
      type: (offerPayload.type?.toLowerCase() as RTCSdpType) ?? 'offer',
      sdp: offerPayload.sdp
    }
  }

  console.log('Incoming call updated:', this.incomingCall)

  this.showIncomingCallModal = true
  this.showCallScreen = false
  // Open chat UI first
  await this.viewMessagePerson(fromUserId, fromUserId)

})


this.connection.on('ReceiveMessage', (message: any) => {
  const myId = sessionStore.getSession()?.userId
  if (message.senderId === myId) return // 🚫 ignore self-echo

  let chat = this.openChats.find(c => c.partnerId === message.senderId)

  if (!chat) {
    chat = {
      partnerId: message.senderId,
      messages: [],
      isOpen: true,
      unread: 0,
      page: 1,
      total: 0
    }
    this.openChats.push(chat)
  }

  chat.messages.push(message)
})


this.connection.on('CallHungUp', (fromUserId: number) => {
  console.log('Remote user hung up:', fromUserId)
  this.cleanupCall()
})


      // Receive Answer
      this.connection.on('ReceiveAnswer', async (answer: any) => {
  console.log('📩 ReceiveAnswer raw:', answer)

  if (!this.peer) {
    console.warn('No peer connection yet')
    return
  }

  // 🔥 NORMALIZE FIELD NAMES
  const normalized = {
    type: answer.type ?? answer.Type,
    sdp: answer.sdp ?? answer.Sdp
  }

  if (!normalized.type || !normalized.sdp) {
    console.error('Invalid answer payload after normalize:', normalized)
    return
  }

  console.log('✅ Normalized answer:', normalized)

  await this.peer.setRemoteDescription(
    new RTCSessionDescription(normalized)
  )
 
  console.log('🎯 Remote description (answer) set on caller')

  // 🧊 Add queued ICE candidates (received before answer)
  console.log('🧊 Adding queued ICE candidates:', this.iceQueue.length)
  for (const c of this.iceQueue) {
    try {
      await this.peer.addIceCandidate(new RTCIceCandidate(c))
      console.log('🧊 Queued ICE candidate added to peer connection')
    } catch (e) {
      console.error('🧊 Queued ICE add failed:', e, c)
    }
  }

  this.iceQueue = []
})


this.connection.on('CallRejected', () => {
  console.log("Call rejected by receiver");
  this.cleanupCall()
  alert('Your call was rejected') // optional toast/notification
})


this.connection.on('ReceiveIce', async (candidate: IceCandidateDto | { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null }) => {
  // Normalize: server may send Candidate (C#) or candidate (JSON)
  const candidateStr = (candidate as IceCandidateDto).Candidate ?? (candidate as { candidate?: string }).candidate;
  const sdpMid = (candidate as IceCandidateDto).SdpMid ?? (candidate as { sdpMid?: string }).sdpMid;
  const sdpMLineIndex = (candidate as IceCandidateDto).SdpMLineIndex ?? (candidate as { sdpMLineIndex?: number }).sdpMLineIndex;

  if (candidateStr) {
    console.log('🧊 ReceiveIce: candidate received', { sdpMid, sdpMLineIndex, snippet: candidateStr.slice(0, 60) + '…' });
  }

  const ice: RTCIceCandidateInit = {
    candidate: candidateStr ?? undefined,
    sdpMid: sdpMid ?? undefined,
    sdpMLineIndex: sdpMLineIndex ?? undefined
  };

  if (!candidateStr || candidateStr === '') return;

  if (!this.peer || !this.peer.remoteDescription) {
    console.log('🧊 ReceiveIce: queueing ICE candidate (no remoteDescription yet)');
    this.iceQueue.push(ice);
    return;
  }

  try {
    await this.peer.addIceCandidate(new RTCIceCandidate(ice));
    console.log('🧊 ReceiveIce: addIceCandidate OK');
  } catch (e) {
    console.error('🧊 ReceiveIce: addIceCandidate failed', e, ice);
  }
});

      await this.connection.start()
      console.log('✅ SignalR connected')
},



    /** ----------------------
     * SEND MESSAGE
     * ---------------------- */

async ensureSignalRConnection(force = false) {
  // Force restart if modal was closed
  if (force && this.connection) {
    try {
      console.warn('🔁 Forcing SignalR restart')
      await this.connection.stop()
    } catch {}
    this.connection = null
  }

  if (!this.connection) {
    await this.initSignalR()
    return
  }

  if (this.connection.state !== signalR.HubConnectionState.Connected) {
    try {
      await this.connection.start()
      console.log('✅ SignalR reconnected')
    } catch (err) {
      console.error('❌ SignalR reconnect failed', err)
    }
  }
},

async sendMessage(receiverId: number, content: string, files: File[]) {
  const sessionStore = useSessionStore()
  const senderId = sessionStore.getSession()?.userId
  const token = localStorage.getItem('token')
  if (!senderId || !token) return

  // Ensure SignalR is initialized
if (!this.inCall) {
  await this.ensureSignalRConnection(true)
}

  if (!this.connection) {
    await this.initSignalR();
  }


  if (!this.connection) return

  // ------------------------------
  // Ensure chat exists in openChats
  // ------------------------------
  let chat = this.openChats.find(c => c.partnerId === receiverId)
  if (!chat) {
    chat = { partnerId: receiverId, messages: [], isOpen: true, unread: 0, page: 1, total: 0 }
    
    this.openChats.push(chat)
  } else {
    chat.isOpen = true
    console.log('openChats BEFORE:', this.openChats.map(c => c.partnerId))

    chat.messages = chat.messages || []
  }

  // 🔥 ALWAYS reactivate chat
//chat.isOpen = true
//chat.unread = 0

  if (!Array.isArray(chat.messages)) chat.messages = []

  // ------------------------------
  // Upload attachments (parallel)
  // ------------------------------
  const uploadedAttachments: any[] = []
  try {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post(
        `${this.apiUrl}/api/chat/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      )
      return { filename: res.data.filename, filepath: res.data.filepath, filetype: file.type }
    })

    const results = await Promise.all(uploadPromises)
    uploadedAttachments.push(...results)
  } catch (err) {
    console.error('Attachment upload failed:', err)
    // Optional: notify user
    alert('Failed to upload one or more attachments')
  }

  // ------------------------------
  // Temporary message for UI
  // ------------------------------
  const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(16).slice(2)
  const tempMessage = {
    id: tempId,
    senderId,
    content,
    attachments: uploadedAttachments,
    createdAt: new Date().toISOString(),
    isTemp: true,
    isError: false
  }

  chat.messages.push(tempMessage)
  // Force reactivity in Vue 3 (sometimes needed)
  chat.messages = [...chat.messages]

  // ------------------------------
  // Send via SignalR
  // ------------------------------
  try {
    const serverMessage: any = await this.connection.invoke(
      'SendMessage',
      receiverId,
      content,
      uploadedAttachments,
     
    )

    // Replace temp message with server message
    if (serverMessage && serverMessage.id) {
      const idx = chat.messages.findIndex(m => m.id === tempId)
      if (idx !== -1) {
        chat.messages[idx] = serverMessage
      } else {
        chat.messages.push(serverMessage)
      }
      // Ensure reactivity
      chat.messages = [...chat.messages]
      return serverMessage
    } else {
      // Server didn't return valid message
      const idx = chat.messages.findIndex(m => m.id === tempId)
      if (idx !== -1) chat.messages[idx].isError = true
      console.warn('Server response invalid, temp message remains')
      return null
    }
  } catch (err) {
    console.error('SignalR sendMessage failed:', err)
    const idx = chat.messages.findIndex(m => m.id === tempId)
    if (idx !== -1) chat.messages[idx].isError = true
    chat.messages = [...chat.messages]
    return null
  }
},





    /** ----------------------
     * VOICE/VIDEO CALL
     * ---------------------- */
/** ----------------------
 * VOICE/VIDEO CALL
 * ---------------------- */
 /** ----------------------
     * START CALL (Caller)
     * ---------------------- */
/** ----------------------
 * START CALL (Caller)
 * ---------------------- */

  logCallError(message: string) {
    console.error('📝 Call error logged:', message);
    this.callErrors.push(message);
  },

  getCallDurationInSeconds(): number {
  if (!this.callStartTime) return 0;
  return Math.floor((Date.now() - this.callStartTime) / 1000);
},
async startCall(
  partnerId: number,
  video = false,
  remoteVideoEl?: HTMLVideoElement | null
) {
  console.group('📞 startCall');
  console.log('Partner ID:', partnerId, 'Video enabled:', video);

  if (this.inCall) {
    console.warn('Already in a call');
    console.groupEnd();
    return;
  }

  if (!this.connection) {
    await this.initSignalR();
    if (!this.connection) {
      console.error('SignalR not initialized');
      console.groupEnd();
      return;
    }
  }

  // Validate partnerId
  if (!partnerId || isNaN(Number(partnerId))) {
    console.error("❌ Invalid partnerId, cannot start call");
    this.logCallError("Invalid partnerId: " + partnerId);
    console.groupEnd();
    return;
  }

  try {
    // 0️⃣ Attempt to start the call on the server
    let callId: number | null = null;
    try {
      callId = await this.connection!.invoke<number>("StartCall", Number(partnerId), video);
      this.currentCallId = callId;
       // ✅ Mark start time here
    this.callStartTime = Date.now();
    console.log('✅ Call created with id', callId, 'Start time set at', new Date(this.callStartTime).toISOString());

      console.log('✅ Call created with id', callId);
    } catch (err: any) {
      const serverError = err?.message ?? JSON.stringify(err);
      this.logCallError("StartCall HubException: " + serverError);
      console.error('❌ startCall failed (server error):', serverError);
      alert('Cannot start call: ' + serverError);
      console.groupEnd();
      return;
    }

    // 1️⃣ Get local media
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    console.log('Local media acquired:', this.localStream.getTracks().map(t => t.kind));

    // 2️⃣ Create remote stream
    this.remoteStream = new MediaStream();

    // 3️⃣ Create peer connection
    this.peer = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    } as RTCConfiguration);

    // 4️⃣ Add local tracks
    this.localStream.getTracks().forEach(track => {
      this.peer!.addTrack(track, this.localStream!);
    });
    console.log('Senders after addTrack:', this.peer.getSenders().map(s => s.track?.kind));

    // 5️⃣ Handle remote tracks
    this.peer.ontrack = (event) => {
      if (!this.remoteStream) this.remoteStream = new MediaStream();
      this.remoteStream.addTrack(event.track);
      this.remoteStream = new MediaStream(this.remoteStream.getTracks());

      console.log('📊 Remote stream tracks:', {
        total: this.remoteStream.getTracks().length,
        video: this.remoteStream.getVideoTracks().length,
        audio: this.remoteStream.getAudioTracks().length
      });

      // Update video element if provided
      if (remoteVideoEl && remoteVideoEl.srcObject !== this.remoteStream) {
        remoteVideoEl.srcObject = this.remoteStream;
        remoteVideoEl.autoplay = true;
        remoteVideoEl.playsInline = true;
        remoteVideoEl.muted = false;
        remoteVideoEl.play().catch(err => console.warn('Remote video play failed', err));
      }
    };

    // 6️⃣ ICE candidates
    const iceQueue: RTCIceCandidateInit[] = [];
    this.peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const payload: IceCandidateDto = {
        Candidate: event.candidate.candidate,
        SdpMid: event.candidate.sdpMid ?? null,
        SdpMLineIndex: event.candidate.sdpMLineIndex ?? null
      };

      if (this.peer!.remoteDescription?.type) {
        this.connection!.invoke('SendIce', Number(partnerId), payload)
          .catch(err => this.logCallError('SendIce failed: ' + err?.message));
      } else {
        iceQueue.push(event.candidate);
      }
    };

    // 7️⃣ Create offer
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    await this.connection!.invoke('SendOffer', Number(partnerId), {
      Type: offer.type ?? 'offer',
      Sdp: offer.sdp ?? ''
    } as SdpDto);

    this.inCall = true;
    this.showCallScreen = true;
    console.log('Call started — waiting for answer');
  } catch (err: any) {
    const errorMsg = err?.message ?? JSON.stringify(err);
    this.logCallError("startCall frontend error: " + errorMsg);
    console.error('❌ startCall failed:', errorMsg);
    alert('Cannot access mic/camera or start call: ' + errorMsg);
  } finally {
    console.groupEnd();
  }
},



/** ----------------------
 * ACCEPT CALL (Callee)
 * ---------------------- */
async acceptCall(
  offerPayload: { type: string; sdp: string; callId?: string },
  partnerId: number,
  remoteVideoEl?: HTMLVideoElement
) {
  console.group('📞 acceptCall');
  console.log('Partner ID:', partnerId);

  if (this.inCall) {
    console.warn('Already in call');
    console.groupEnd();
    return;
  }

  if (!offerPayload?.sdp) {
    console.error('No valid offer payload');
    console.groupEnd();
    return;
  }

  if (!this.connection) await this.initSignalR();
  if (!this.connection) {
    console.error('SignalR unavailable');
    console.groupEnd();
    return;
  }

  try {
    const hasVideo = offerPayload.sdp.includes('m=video');
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: hasVideo });
    console.log('Local media acquired:', this.localStream.getTracks().map(t => t.kind));

    this.remoteStream = new MediaStream();

    this.peer = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    } as RTCConfiguration);

    // 1️⃣ Add local tracks BEFORE setRemoteDescription
    this.localStream.getTracks().forEach(track => this.peer!.addTrack(track, this.localStream!));
    console.log('Senders after addTrack:', this.peer.getSenders().map(s => s.track?.kind));

    // 2️⃣ Handle remote tracks
    this.peer.ontrack = (event) => {
      console.log('📥 Remote track received:', {
        kind: event.track.kind,
        id: event.track.id,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streams: event.streams.length
      });
      
      // Ensure remoteStream exists
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      
      // Add track to remote stream
      this.remoteStream.addTrack(event.track);
      
      // Assign new reference so Vue/Pinia watchers re-run (they only see reference change)
      this.remoteStream = new MediaStream(this.remoteStream.getTracks());
      
      console.log('📊 Remote stream tracks:', {
        total: this.remoteStream.getTracks().length,
        video: this.remoteStream.getVideoTracks().length,
        audio: this.remoteStream.getAudioTracks().length
      });

      // Update video element if provided (fallback for direct assignment)
      if (remoteVideoEl && remoteVideoEl.srcObject !== this.remoteStream) {
        remoteVideoEl.srcObject = this.remoteStream;
        remoteVideoEl.autoplay = true;
        remoteVideoEl.playsInline = true;
        remoteVideoEl.muted = false;
        remoteVideoEl
          .play()
          .then(() => console.log('✅ Remote video playing (direct assignment)'))
          .catch(err => console.warn('Remote video play failed', err));
      }
      
      // Ensure audio tracks are enabled
      event.track.onended = () => {
        console.log(`Track ended: ${event.track.kind} (${event.track.id})`);
      };
    };

    // 3️⃣ ICE candidates (callee: send to caller via SignalR)
    this.peer.onicecandidate = async (event) => {
      if (!event.candidate || !this.connection) return;

      const iceCandidate: IceCandidateDto = {
        Candidate: event.candidate.candidate,
        SdpMid: event.candidate.sdpMid ?? null,
        SdpMLineIndex: event.candidate.sdpMLineIndex ?? null
      };

      console.log('🧊 acceptCall: sending ICE candidate (SendIce)', {
        toPartnerId: partnerId,
        sdpMid: iceCandidate.SdpMid,
        sdpMLineIndex: iceCandidate.SdpMLineIndex,
        candidateSnippet: iceCandidate.Candidate?.slice(0, 80) + (iceCandidate.Candidate?.length > 80 ? '…' : '')
      });
      await this.connection.invoke('SendIce', Number(partnerId), iceCandidate);
    };





    // 4️⃣ Set remote description
    await this.peer.setRemoteDescription({ type: offerPayload.type as RTCSdpType, sdp: offerPayload.sdp });

    // 5️⃣ Create and send answer
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
await this.connection.invoke('SendAnswer', Number(partnerId), {
  Type: answer.type ?? 'answer',
  Sdp: answer.sdp ?? ''
} as SdpDto);

    this.inCall = true;
    this.showCallScreen = true;
    this.currentCallUserId = partnerId;
    this.currentCallId = Number(offerPayload.callId) || null;

    console.log('Call accepted successfully');
  } catch (err) {
    console.error('❌ acceptCall failed:', err);
    alert('Cannot access mic/camera or accept call.');
  } finally {
    console.groupEnd();
  }
},




    /** ----------------------
     * END / REJECT CALL
     * ---------------------- */
async endCall() {
  const durationInSeconds = this.getCallDurationInSeconds();

  if (this.connection && this.currentCallId) {
    try {
      // Call the Hub method directly
      await this.connection.invoke("EndCall", this.currentCallId, durationInSeconds);
      console.log("Call ended:", this.currentCallId, durationInSeconds, "seconds");
    } catch (err) {
      console.error("EndCall failed:", err);
    }
  }

  this.cleanupCall();
},


/** ----------------------
 * END / REJECT CALL
 * ---------------------- */

rejectIncomingCall(fromUserId?: number | string) {
  if (!this.connection) return;

  try {
    // Ensure id is a number
    const id = Number(fromUserId ?? this.incomingCall?.fromUserId);
    if (!id) return;

    console.log('Store rejectIncomingCall called, notifying userId:', id);

    this.connection.invoke('RejectCall', id)
      .catch(err => console.error('Error notifying caller:', err));
  } catch (err) {
    console.error('Error in rejectIncomingCall:', err);
  }

  this.cleanupCall();

  this.showCallScreen = false
  this.showIncomingCallModal = false
},


  cleanupCall() {
    this.peer?.close();
    this.peer = null;
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.inCall = false;
    this.incomingCall = null;

    this.showCallScreen = false
    this.showIncomingCallModal = false
  },



  async deleteMessage(userId: number, messageId: number){
    try {
      const token = localStorage.getItem("token")
      const response = await axios.patch(`${this.apiUrl}/api/chat/delete-message/${userId}`,{messageId}, {
        withCredentials : true,
        headers: {'Content-Type' : 'application/json',Authorization:  `Bearer ${token}`}
      })
      alert("Message: " + response.data.message)
    } catch (error: any) { 
      alert('Error Message: ' + error?.response?.data.message)
    }
  },

async reactionMessage(messageId: number, reactionType: number) {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.post(
      `${this.apiUrl}/api/chat/react/${messageId}/${reactionType}`,
      {},
      {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.data.status === 200) {
      console.log("Message: " + response.data.message);
    }
  } catch (error) {
    console.log(error);
  }
}



  }  

  
})
