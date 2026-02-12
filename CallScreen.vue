<template>
  <div class="fixed inset-0 z-50 bg-black flex items-center justify-center">
    <!-- Remote Video -->
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      class="absolute inset-0 w-full h-full object-cover z-0"
    ></video>

    <!-- Dark overlay -->
    <div class="absolute inset-0 bg-black/30 pointer-events-none"></div>

    <!-- Local Video (PiP) -->
    <video
      ref="localVideo"
      autoplay
      muted
      playsinline
      class="absolute top-4 right-4 w-36 h-28 sm:w-44 sm:h-32 rounded-xl object-cover border border-white/20 shadow-2xl z-10"
    ></video>

    <!-- Controls -->
    <div
      class="absolute bottom-6 flex items-center gap-4 bg-black/60 backdrop-blur-md px-6 py-4 rounded-full shadow-xl z-10"
    >
      <!-- Mic -->
      <button
        @click="toggleMic"
        class="px-5 py-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-sm transition"
      >
        {{ micEnabled ? 'Mute' : 'Unmute' }}
      </button>

      <!-- Camera -->
      <button
        v-if="hasVideo"
        @click="toggleVideo"
        class="px-5 py-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-sm transition"
      >
        {{ videoEnabled ? 'Turn Off Camera' : 'Turn On Camera' }}
      </button>

      <!-- Hang up -->
      <button
        @click="hangUp"
        class="px-6 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold transition"
      >
        Hang Up
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted, onUnmounted, watchEffect } from 'vue'
import { useMessengerStore } from '#imports'

const messengerStore = useMessengerStore()

const remoteVideo = ref<HTMLVideoElement | null>(null)
const localVideo = ref<HTMLVideoElement | null>(null)

const videoEnabled = ref(true)
const micEnabled = ref(true)

const hasVideo = computed(() => !!messengerStore.localStream?.getVideoTracks().length)

// Toggle mic
const toggleMic = () => {
  const tracks = messengerStore.localStream?.getAudioTracks()
  if (!tracks?.length) return
  micEnabled.value = !micEnabled.value
  tracks.forEach(t => (t.enabled = micEnabled.value))
}

// Toggle camera
const toggleVideo = () => {
  const tracks = messengerStore.localStream?.getVideoTracks()
  if (!tracks?.length) return
  videoEnabled.value = !videoEnabled.value
  tracks.forEach(t => (t.enabled = videoEnabled.value))
}

// Hang up call
const hangUp = () => messengerStore.endCall()

// -----------------------------
// Remote Video + Audio (debounced so rapid track additions don't interrupt play())
// -----------------------------
let remoteVideoUpdateTimer: ReturnType<typeof setTimeout> | null = null

const applyRemoteStreamAndPlay = async (stream: MediaStream) => {
  if (!remoteVideo.value) return

  console.log('📹 Applying remote stream to video element:', {
    videoTracks: stream.getVideoTracks().length,
    audioTracks: stream.getAudioTracks().length
  })

  stream.getAudioTracks().forEach(track => { track.enabled = true })

  remoteVideo.value.srcObject = stream
  remoteVideo.value.autoplay = true
  remoteVideo.value.playsInline = true
  remoteVideo.value.muted = false

  try {
    await remoteVideo.value.play()
    console.log('✅ Remote video playing with audio')
  } catch (err) {
    console.warn('Remote video play() failed (often autoplay policy):', err)
  }
}

const updateRemoteVideo = async (stream: MediaStream | null) => {
  if (!stream) return
  if (!remoteVideo.value) return

  if (remoteVideoUpdateTimer) {
    clearTimeout(remoteVideoUpdateTimer)
    remoteVideoUpdateTimer = null
  }

  remoteVideoUpdateTimer = setTimeout(async () => {
    remoteVideoUpdateTimer = null
    await applyRemoteStreamAndPlay(stream)
  }, 80)
}

// Watch for remote stream changes
watch(
  () => messengerStore.remoteStream,
  async (stream) => {
    await updateRemoteVideo(stream)
    // Refs may not exist yet on first run (receiver: stream set before CallScreen mounts). Retry after mount.
    if (stream && !remoteVideo.value) {
      await nextTick()
      await updateRemoteVideo(stream)
    }
  },
  { immediate: true }
)

// Also watch for track additions to existing stream (deep watch on track count and track states)
watch(
  () => {
    const stream = messengerStore.remoteStream
    if (!stream) return null
    return {
      count: stream.getTracks().length,
      videoCount: stream.getVideoTracks().length,
      audioCount: stream.getAudioTracks().length,
      trackStates: stream.getTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState }))
    }
  },
  async () => {
    if (messengerStore.remoteStream && remoteVideo.value) {
      await nextTick()
      await updateRemoteVideo(messengerStore.remoteStream)
    }
  },
  { deep: true }
)

// -----------------------------
// Local Video (PiP)
// -----------------------------
watchEffect(async () => {
  const stream = messengerStore.localStream
  const video = localVideo.value
  if (!stream || !video) return

  await nextTick()
  video.srcObject = stream
  video.autoplay = true
  video.playsInline = true
  video.muted = true // local video muted to avoid echo

  try {
    await video.play()
    console.log('✅ Local video playing')
  } catch (err) {
    console.warn('Local video play blocked:', err)
  }
})

// -----------------------------
// Autoplay fix for browsers (retry remote video play on first user click)
// -----------------------------
const resumeAudio = () => {
  if (remoteVideo.value && messengerStore.remoteStream) {
    remoteVideo.value.srcObject = messengerStore.remoteStream
    remoteVideo.value.muted = false
    remoteVideo.value
      .play()
      .then(() => console.log('✅ Remote video playing with audio (after user click)'))
      .catch((err) => console.warn('Remote video play retry failed:', err))
  }
}

// -----------------------------
// Receiver: remote stream is set during acceptCall before CallScreen mounts.
// Apply immediately on mount (no debounce) so remote video shows right away.
// -----------------------------
onMounted(async () => {
  window.addEventListener('click', resumeAudio, { once: true })

  if (messengerStore.remoteStream && remoteVideo.value) {
    await nextTick()
    await applyRemoteStreamAndPlay(messengerStore.remoteStream)
    console.log('📹 CallScreen mounted: applied remote stream')
  }
})

onUnmounted(() => {
  if (remoteVideoUpdateTimer) {
    clearTimeout(remoteVideoUpdateTimer)
    remoteVideoUpdateTimer = null
  }
  window.removeEventListener('click', resumeAudio)
  if (localVideo.value) localVideo.value.srcObject = null
  if (remoteVideo.value) remoteVideo.value.srcObject = null
})
</script>

<style scoped>
video {
  background-color: black;
}
</style>
