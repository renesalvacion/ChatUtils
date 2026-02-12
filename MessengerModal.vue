<template>
<transition name="chat">
  <div
    v-if="chat"
    class="fixed bottom-0 sm:bottom-24 z-50
           w-full sm:w-80 md:w-96
           max-h-[90vh]
           bg-white rounded-t-lg sm:rounded-lg
           shadow-xl overflow-hidden"
    :style="{ right: isMobile ? '0px' : `${modalOffset}px` }"
  >
    <!-- Header -->
    <div class="bg-blue-600 text-white p-3 flex justify-between items-center">
      <span class="font-semibold truncate">
        Chat with Partner {{ chat.partnerId }}
      </span>

      <div class="flex items-center gap-3">
        <!-- Voice Call -->
        <svg
          @click="startVoiceCall"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          class="w-5 h-5 cursor-pointer hover:text-green-300"
        >
          <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.2.48 2.5.74 3.86.74a1 1 0 011 1V20a1 1 0 01-1 1c-9.39 0-17-7.61-17-17a1 1 0 011-1h3.5a1 1 0 011 1c0 1.36.26 2.66.74 3.86a1 1 0 01-.21 1.11l-2.2 2.2z"/>
        </svg>

        <!-- Video Call -->
        <svg
          @click="startVideoCall"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          class="w-5 h-5 cursor-pointer hover:text-green-300"
        >
          <path d="M17 10.5V7c0-1.1-.9-2-2-2H3C1.9 5 1 5.9 1 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3.5l4 4v-11l-4 4z"/>
        </svg>

        <!-- Close -->
        <button class="cursor-pointer" @click="$emit('close', chat.partnerId)">✕</button>
      </div>
    </div>

    <!-- Incoming Call Modal -->
    <div
      v-if="messengerStore.incomingCall"
      class="fixed inset-0 flex items-center justify-center z-50"
      :style="{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }"
    >
      <div class="bg-white p-4 rounded-lg shadow-lg w-80 text-center">
        <p class="mb-4 font-semibold">
          {{ messengerStore.incomingCall.video ? 'Video' : 'Voice' }} call from User
          {{ messengerStore.incomingCall.fromUserId }}
        </p>

        <div class="flex justify-around gap-4">
          <button
            :disabled="!offerAvailable"
            @click="acceptIncomingCall"
            class="cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            Accept
          </button>

          <button
            @click="rejectIncomingCall"
            class="cursor-pointer bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>




    <!-- Loading older messages -->
    <div v-if="isLoadingOlder" class="text-xs text-center text-gray-400">
      Loading older messages...
    </div>

    <!-- Messages -->
    <div ref="messagesEl" @scroll="onScroll" class="p-3 h-72 sm:h-96 overflow-y-auto flex flex-col gap-2">
      <div
        v-for="(msg, i) in formattedMessages"
        :key="i"
        :class="['flex flex-col', msg.isSender ? 'ml-auto' : 'mr-auto']"
      >
<div
  class="break-words whitespace-pre-wrap max-w-[75%] sm:max-w-[80%] flex flex-col gap-1 relative group"
  :class="isImageOnly(msg)
    ? 'bg-transparent p-0 shadow-none'
    : msg.isSender
      ? 'bg-blue-600 text-white px-3 py-2 rounded-lg'
      : 'bg-gray-200 text-gray-900 px-3 py-2 rounded-lg'"
>


        <!-- Message actions (3 dots) -->
<div class="relative self-end">
  <button
    class="cursor-pointer text-xs opacity-70 hover:opacity-100"
    @click="toggleMenu(Number(i))"
  >
    ⋯
  </button>

  <!-- Dropdown -->
  <div
    v-if="openMenuIndex === i"
    class="absolute right-0 mt-1 bg-white text-black rounded shadow-md text-xs z-10"
  >
    <button

      class="cursor-pointer block px-3 py-1 hover:bg-gray-100 w-full text-left"
      @click="deleteUserMessage(msg.id)"
    >
      Delete
    </button>
    <button
      class="cursor-pointer block px-3 py-1 hover:bg-gray-100 w-full text-left"
      @click="openMenuIndex = null"
    >
      Cancel
    </button>
  </div>
</div>

          <!-- Text -->
                      <!-- Text -->
<!-- Text + Hover Reactions -->
<!-- Text + Hover Reactions -->
<!-- Message + Reactions -->
<div
  v-if="msg.content"
  class="relative group" 
>
  <!-- Message bubble -->
<!-- OUTER bubble (sender / receiver) -->
<!-- OUTER bubble -->
<div
  class="relative inline-block rounded-xl"
  :class="msg.isSender
    ? 'bg-blue-600 p-1'
    : 'bg-gray-200 px-3 py-2'"
>
  <!-- SENDER: white inner card -->
  <div
    v-if="msg.isSender"
    class="bg-white text-black rounded-lg px-3 py-2"
  >
    {{ msg.content }}
  </div>

  <!-- RECEIVER: plain text -->
  <div
    v-else
    class="text-black"
  >
    {{ msg.content }}
  </div>
</div>



  <!-- Reaction hover -->
<div
  class="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-2
         flex gap-2 bg-sky-100 shadow-lg rounded-full px-3 py-2
         opacity-0 group-hover:opacity-100 hover:opacity-100
         transition-all duration-200 pointer-events-auto z-[9999]"
>

    <!-- 👍 Like -->
    <svg @click="reactionTyp(msg.id, 1)" class="w-10 h-10 react-pop cursor-pointer hover:scale-110 transition text-blue-400"
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 9V5a3 3 0 00-6 0v4H5a2 2 0 00-2 2v2a2 2 0 002 2h3v6h8l3-8v-4h-5z"/>
    </svg>

    <!-- 😂 Laugh -->
    <svg @click="reactionTyp(msg.id, 3)" class="w-10 h-10 react-pop cursor-pointer hover:scale-110 transition text-yellow-300"
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-4 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm8 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-8 6h8a4 4 0 01-8 0z"/>
    </svg>

    <!-- 😢 Sad -->
    <svg @click="reactionTyp(msg.id, 5)" class="w-10 h-10 react-pop cursor-pointer hover:scale-110 transition text-yellow-500"
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-3 9a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-7 6a4 4 0 018 0H8z"/>
    </svg>

    <!-- 😡 Angry -->
    <svg @click="reactionTyp(msg.id, 6)" class="w-10 h-10 react-pop cursor-pointer hover:scale-110 transition text-red-500"
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-4 9l2-1 2 1-2-2-2 2zm8 0l-2-1-2 1 2-2 2 2zm-8 6h8a3 3 0 00-8 0z"/>
    </svg>
  </div>
</div>




          <!-- Attachments -->
          <div v-if="msg.attachments?.length" class="mt-1 flex flex-col gap-1">
            <template v-for="att in msg.attachments" :key="att.filepath">
              <img v-if="isImage(att.filename)" :src="att.filepath" class="max-w-xs rounded-lg cursor-pointer" loading="lazy" />
              <a v-else :href="att.filepath" target="_blank" class="text-blue-500 underline text-xs break-words">{{ att.filename }}</a>
            </template>
          </div>

          <!-- Time -->
          <div class="text-[10px] opacity-70 text-right mt-1">{{ formatTime(msg.createdAt) }}</div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t p-2 flex items-center gap-2">
      <!-- File / Image Buttons -->
      <svg @click="triggerFileInput('file')" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 cursor-pointer text-gray-500 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828a4 4 0 10-5.656-5.656L5.757 10.515a6 6 0 108.486 8.486L20.5 12"/>
      </svg>
      <svg @click="triggerFileInput('image')" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 cursor-pointer text-gray-500 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h18v14H3V5zm0 0l4 4h10l4-4M8 13l2.5 3 3.5-4.5L18 17"/>
      </svg>

      <input type="file" ref="fileInput" class="hidden" @change="onFileChange" />
      <input type="file" ref="imageInput" accept="image/*" class="hidden" @change="onFileChange" />

      <!-- Selected attachments preview -->
      <div v-if="selectedFiles.length" class="p-2 flex flex-wrap gap-2 border-b border-gray-200 max-h-36 overflow-y-auto">
        <div
          v-for="(file, idx) in selectedFiles"
          :key="idx"
          class="relative w-20 h-20 border rounded overflow-hidden flex items-center justify-center bg-gray-50"
        >
          <!-- Image preview -->
   <img
  v-if="file.type.startsWith('image/')"
  :src="previewUrl(file)"
  class="w-full h-full object-cover"
/>

          <!-- Non-image file -->
          <div v-else class="text-xs text-center px-1 break-words">
            {{ file.name }}
          </div>

          <!-- Remove button -->
          <button
            @click="selectedFiles.splice(idx, 1)"
            class="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-700"
            type="button"
          >✕</button>
        </div>
      </div>

      <input
        v-model="message"
        placeholder="Type a message..."
        class="flex-1 text-sm px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        @keyup.enter="sendMessage"
      />

      <button @click="sendMessage" class="bg-blue-600 p-2 rounded-full text-white hover:bg-blue-700">➤</button>
    </div>
  </div>
</transition>


  <!-- Call Screen -->
  <CallScreen ref="callScreen" v-if="messengerStore.inCall" />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '#imports'

import { useMessengerStore } from '../stores/chat';
import CallScreen from './CallScreen.vue'

const props = defineProps<{ chat: any; index: number }>()
defineEmits(['close'])

const sessionStore = useSessionStore()
const messengerStore = useMessengerStore()




const previewUrl = (file: File) => window.URL.createObjectURL(file)

// ------------------ Reactive Variables ------------------
const message = ref('')
const selectedFiles = ref<File[]>([])
const messagesEl = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const isMobile = ref(false)
const isLoadingOlder = ref(false)

const modalOffset = computed(() => 24 + props.index * 360)

const openMenuIndex = ref<number | null>(null)

  const toggleMenu = (index: number ) => {
  openMenuIndex.value = openMenuIndex.value === index ? null : index
}

const reactionTyp = async(messageId:number, reactionType:number) => {
  await messengerStore.reactionMessage(messageId, reactionType)
}

const deleteMessage = async (msg: any, index: number) => {
  openMenuIndex.value = null

  // OPTIONAL: backend call
  // await messengerStore.deleteMessage(msg.id)

  // frontend-only delete (safe fallback)
  props.chat.messages.splice(index, 1)
}

const deleteUserMessage = (messageId: number) => {
  const userId = sessionStore.getSession()?.userId
  console.log("User ID: " + userId);

  if(!userId){
    console.log('User ID is undefine');
    return
    
  }
  
  messengerStore.deleteMessage(userId,messageId)  
}


// ------------------ Screen Resize ------------------
const updateScreen = () => isMobile.value = window.innerWidth < 640
onMounted(() => {
  updateScreen()
  window.addEventListener('resize', updateScreen)
})
onUnmounted(() => window.removeEventListener('resize', updateScreen))
const callScreen = ref<any>(null)
// ------------------ Calls ------------------
const startVoiceCall = async () => {
  await messengerStore.startCall(props.chat.partnerId, false)
  // Wait for CallScreen to mount, then update video element
  await nextTick()
  if (callScreen.value?.remoteVideo && messengerStore.remoteStream) {
    callScreen.value.remoteVideo.srcObject = messengerStore.remoteStream
  }
}

const startVideoCall = async () => {
  await messengerStore.startCall(props.chat.partnerId, true)
  // Wait for CallScreen to mount, then update video element
  await nextTick()
  if (callScreen.value?.remoteVideo && messengerStore.remoteStream) {
    callScreen.value.remoteVideo.srcObject = messengerStore.remoteStream
  }
}

const acceptIncomingCall = async () => {
  const call = messengerStore.incomingCall
  if (!call?.offer?.sdp) return alert('Invalid offer received')
  try {
    // Get the remote video element from CallScreen component
    const remoteEl = callScreen.value?.remoteVideo
    await messengerStore.acceptCall({ type: call.offer.type.toLowerCase(), sdp: call.offer.sdp }, call.fromUserId, remoteEl)
  } catch (err) {
    console.error("Error accepting call:", err)
    alert("Error accepting call. Check console for details.")
  }
}

const rejectIncomingCall = () => {
  const call = messengerStore.incomingCall
  console.log('rejectIncomingCall clicked', call) // ✅ add this

  if (!call) return

  messengerStore.rejectIncomingCall(call.fromUserId) // send signal to other user

  // Clear call state locally
  messengerStore.incomingCall = null
  messengerStore.inCall = false
  messengerStore.remoteStream = null
  messengerStore.localStream?.getTracks().forEach(track => track.stop())
  messengerStore.localStream = null
}

// ------------------ Messages ------------------
const formattedMessages = computed(() => {
  const userId = sessionStore.getSession()?.userId
  const msgs = Array.isArray(props.chat?.messages)
    ? props.chat.messages
    : Array.isArray(props.chat?.messages?.messages)
      ? props.chat.messages.messages
      : []

  return msgs
    .filter((msg:any): msg is any => msg != null) // remove null/undefined
    .map((msg:any) => ({
      ...msg,
      isSender: msg.senderId === userId,
      attachments: msg.attachments?.map((a:any) => ({
        ...a,
        filetype: a.filetype?.toLowerCase() || 'application/octet-stream'
      })) || []
    }))
})


const isImage = (file:string) => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file)
const isImageOnly = (msg:any) => !msg.content?.trim() && msg.attachments?.every((a:any) => a.filetype?.startsWith('image/'))
const formatTime = (time:string) => time ? new Date(time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''

const scrollToBottom = async (smooth=false) => {
  await nextTick()
  if (!messagesEl.value) return
  messagesEl.value.scrollTo({ top: messagesEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

const onScroll = async () => {
  if (!messagesEl.value || isLoadingOlder.value) return
  if (messagesEl.value.scrollTop === 0) {
    isLoadingOlder.value = true
    const prevHeight = messagesEl.value.scrollHeight
    const userId = sessionStore.getSession()?.userId
    if (!userId) return
    await messengerStore.loadOlderMessages(props.chat.partnerId, userId)
    await nextTick()
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight - prevHeight
    isLoadingOlder.value = false
  }
}

// ------------------ Send Messages ------------------
const triggerFileInput = (type:'file'|'image') => type === 'file' ? fileInput.value?.click() : imageInput.value?.click()
const onFileChange = (e:Event) => {
  const input = e.target as HTMLInputElement
  if(input.files) selectedFiles.value = Array.from(input.files)
}
const sendMessage=async()=>{
  const session=sessionStore.getSession()
  if(!session?.userId) return
  if(!message.value.trim()&&!selectedFiles.value.length) return
  console.log("ID: " + props.chat.partnerId);
  
  await messengerStore.sendMessage(props.chat.partnerId,message.value,selectedFiles.value)
  message.value=''; selectedFiles.value=[]
}


// ------------------ Scroll Watchers ------------------
//watch(() => props.chat, async val => { if(val) await scrollToBottom(false) }, { immediate: true })
watch(
  () => props.chat.messages,
  async () => {
    await scrollToBottom(false)
  },
  { deep: true, immediate: true }
)

const isNearBottom = () => !messagesEl.value || messagesEl.value.scrollHeight - messagesEl.value.scrollTop - messagesEl.value.clientHeight < 80
watch(() => formattedMessages.value.length, async () => { if(isNearBottom()) await scrollToBottom(true) })

// ------------------ Reactive offer check ------------------
const offerAvailable = computed(() => !!messengerStore.incomingCall?.offer?.sdp)
</script>

<style scoped>
.chat-enter-active, .chat-leave-active{transition: all 0.25s ease;}
.chat-enter-from, .chat-leave-to{opacity:0; transform:translateY(10px);}
img{display:block; max-width:100%; height:auto;}


/* Base pop when hover container appears */
.react-pop {
  animation: popIn 0.25s ease-out forwards;
  transform-origin: bottom center;
}

/* Floating idle motion (FB vibe) */
.react-pop:hover {
  animation: float 0.8s ease-in-out infinite;
}

/* Stagger delay like Facebook */
.react-pop:nth-child(1) { animation-delay: 0s; }
.react-pop:nth-child(2) { animation-delay: 0.05s; }
.react-pop:nth-child(3) { animation-delay: 0.1s; }
.react-pop:nth-child(4) { animation-delay: 0.15s; }

@keyframes popIn {
  0% {
    transform: translateY(10px) scale(0.6);
    opacity: 0;
  }
  80% {
    transform: translateY(-2px) scale(1.05);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1.1); }
  50% { transform: translateY(-6px) scale(1.15); }
}

.react-pop:hover {
  animation: float 0.8s ease-in-out infinite, wiggle 0.4s ease-in-out;
}

@keyframes wiggle {
  0% { rotate: 0deg; }
  25% { rotate: -6deg; }
  50% { rotate: 6deg; }
  75% { rotate: -4deg; }
  100% { rotate: 0deg; }
}


</style>
