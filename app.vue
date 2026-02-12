<template>
  <link
    href="https://fonts.googleapis.com/icon?family=Material+Icons"
    rel="stylesheet"
  />

  <!-- Page wrapper -->
  <div class="h-screen flex overflow-hidden">
    <!-- Sidebar -->
    <sidebar v-if="route.path !== '/'" />

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto">
      <NuxtPage />


      <MessengerModal
  v-for="(chat, index) in messengerStore.openChats.filter(c => c.isOpen)"
  :key="chat.partnerId + '-' + chat.page"
  :chat="chat"
  :index="index"
  @close="messengerStore.closeChat"
/>



<div
  class="userData cards bg-white rounded-lg shadow-lg h-64 w-80 p-4 relative"
  v-if="isChatModal"
>
  <!-- Close Button -->
  <button
    type="button"
    class="cursor-pointer absolute top-2 right-2 p-2 rounded-full text-gray-500 hover:text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
    @click="isChatModal = false"
    aria-label="Close Chat Modal"
  >
    <!-- Close Icon (SVG) -->
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      class="w-5 h-5 fill-current"
    >
      <path
        d="M19 6.41L17.59 5 12 10.59 6.41 5
         5 6.41 10.59 12 5 17.59
         6.41 19 12 13.41 17.59 19
         19 17.59 13.41 12z"
      />
    </svg>
  </button>

  <!-- Chat List -->
  <ul class="space-y-3 overflow-y-auto h-full pt-6">
    <li v-for="chat in getChatOption" :key="chat.userId">
      <button
        type="button"
        class="w-full text-left border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-cyan-100 hover:to-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-sm hover:shadow-md transition duration-200"
        @click="viewMessage(chat.userId)"
        :aria-label="`View chat with ${chat.name}`"
      >
        <p class="text-xs text-gray-600">
          <span class="font-semibold">User ID:</span> {{ chat.userId }}
        </p>
        <p class="text-sm font-medium text-gray-800">
          {{ chat.name }}
        </p>
        <p class="text-xs text-gray-500">
          <span class="font-semibold">Role:</span> {{ chat.roles }}
        </p>
      </button>
    </li>
  </ul>
</div>
<button
  class="cursor-pointer bg-gradient-to-r from-cyan-200 to-cyan-300 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow-sm hover:from-cyan-400 hover:to-cyan-500 hover:text-white transition duration-200"
  @click="fetchOption()"
  aria-label="Fetch available message options for the chat"
  title="Fetch Available Message Options"
>
  Chat People
</button>


    </main>
  </div>
</template>

<script setup lang="ts">
interface ChatPartner {
  partnerId: number;
  messages: any[];
}



import { useRoute } from "vue-router";
import sidebar from "~/components/sidebar.vue";
import MessengerModal from "./components/MessengerModal.vue";
import { userStores } from "#imports";

import { onMounted, nextTick } from 'vue'
import { useMessengerStore } from "#imports";


const route = useRoute();

const notificationsStore = useNotificationsStore();
const messengerStore = useMessengerStore();
const sessionStore = useSessionStore();

const getChatOption = ref<any[]>([]);
const partner = ref<ChatPartner[]>([]);

const isChatModal = ref(false);

const storeUser = userStores();

const selectedPartnerId = ref<number | null>(null)

const viewMessage = async (partnerId: number) => {
  if (!session.value?.userId) {
    await sessionStore.getSession()
  }

  const userId = session.value?.userId
  if (!userId) return

  // Fetch messages / ensure chat exists
  await messengerStore.viewMessagePerson(userId, partnerId)

  // Wait for Vue to reactively register new chat
  await nextTick()

  // Open modal
await messengerStore.viewMessagePerson(userId, partnerId)


  isChatModal.value = true
}



const fetchOption = async () => {
  await storeUser.getUserDataChat();
  isChatModal.value = true;
  getChatOption.value = storeUser.messageOption;
};

onMounted(async () => {
  // 1️⃣ Ensure session exists
  await sessionStore.getSession()

  // 2️⃣ Init SignalR only if user is logged in
  if (sessionStore.session?.userId) {
    await messengerStore.initSignalR()
  }
})


// Reactive reference to session
const session = computed(() => sessionStore.session);
</script>
