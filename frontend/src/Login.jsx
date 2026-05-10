import { useState } from 'react'

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [message, setMessage] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage("Logging in...")

    try {
      const response = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totp_code: totpCode || null }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("token", data.access_token)
        setMessage("✅ Login Successful!")
        setTimeout(() => { onLoginSuccess() }, 1000)
      } else if (response.status === 403 && data.detail === "2FA_REQUIRED") {
        setRequires2FA(true)
        setMessage("🛡️ 2FA Required. Enter your 6-digit Authenticator code.")
      } else {
        setMessage("❌ " + data.detail)
      }
    } catch (error) {
      setMessage("❌ Server is offline.")
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-700">
        <h2 className="text-3xl font-bold text-green-400 mb-6 text-center">GameVault</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          
          {!requires2FA ? (
            <>
              <div>
                <label className="block text-gray-400 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 text-white rounded outline-none focus:ring-2 focus:ring-green-400" required />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-700 text-white rounded outline-none focus:ring-2 focus:ring-green-400" required />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-gray-400 mb-1 text-center font-bold text-xl">Enter 6-Digit Code</label>
              <input 
                type="text" maxLength="6" required 
                value={totpCode} onChange={(e) => setTotpCode(e.target.value)} 
                className="w-full p-4 bg-gray-900 text-green-400 font-mono text-center text-3xl tracking-[1em] rounded outline-none focus:ring-2 focus:ring-green-400" 
                placeholder="000000" 
              />
            </div>
          )}

          <button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-gray-900 font-bold p-3 rounded transition-colors">
            {requires2FA ? "Verify Code" : "Enter Vault"}
          </button>
        </form>

        {message && <div className="mt-4 text-center text-gray-300 font-semibold">{message}</div>}
      </div>
    </div>
  )
}

export default Login