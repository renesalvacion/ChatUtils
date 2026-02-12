
// You can put this at the top of the file or in a separate types file
export interface SessionType {
  email: string
  role: string
  userId: number
  name: string
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    session: null as SessionType | null,
    token: localStorage.getItem("token") || null
  }),
  actions: {
    parseJwt(token: string): any | null {
  try {
    const base64Url = token.split('.')[1] // get the payload

    let base64 = ''
    if(base64Url !== undefined){
      base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    }
    
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    console.error('Invalid token', e)
    return null
  }
},
    getSession(): SessionType | null {
      if (this.session) return this.session
      const token = this.token || localStorage.getItem("token")
      if (!token) return null

      const decoded = this.parseJwt(token)
      if (!decoded) return null

      this.session = {
        email: decoded.email || decoded.sub || "",
        role: decoded.role || "",
        userId: decoded.userId || Number(decoded.sub) || 0,
        name: decoded.name || ""
      }

      this.token = token // keep it in store
      return this.session
    },

    setToken(token: string) {
      this.token = token
      localStorage.setItem("token", token)
    },

    clearSession() {
      this.session = null
      this.token = null
      localStorage.removeItem("token")
    }
  }
})
