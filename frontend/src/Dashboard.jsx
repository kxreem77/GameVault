import { useState, useEffect } from 'react'

function Dashboard({ onLogout }) {
  const [userData, setUserData] = useState(null)
  const [error, setError] = useState('')
  const [games, setGames] = useState([])
  const [newGame, setNewGame] = useState({ title: '', genre: '', platform: '' })
  const [isAdding, setIsAdding] = useState(false)
  const [selectedGame, setSelectedGame] = useState(null)
  const [reviews, setReviews] = useState([])
  const [newReview, setNewReview] = useState({ rating: 5, text: '' })
  const [isReviewing, setIsReviewing] = useState(false)
  
  // 2FA State
  const [qrUri, setQrUri] = useState(null)
  const [is2FASetupVisible, setIs2FASetupVisible] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token")
      try {
        const userResponse = await fetch("http://127.0.0.1:8000/vip-lounge", { headers: { "Authorization": `Bearer ${token}` } })
        if (userResponse.ok) setUserData(await userResponse.json())
        else { setError("Unauthorized access."); return }

        const gamesResponse = await fetch("http://127.0.0.1:8000/games", { headers: { "Authorization": `Bearer ${token}` } })
        if (gamesResponse.ok) setGames(await gamesResponse.json())
      } catch (err) { setError("Failed to connect.") }
    }
    fetchDashboardData()
  }, [])

  const handleAddGame = async (e) => {
    e.preventDefault()
    setIsAdding(true)
    const token = localStorage.getItem("token")
    try {
      const response = await fetch("http://127.0.0.1:8000/games", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(newGame)
      })
      if (response.ok) { setGames([...games, await response.json()]); setNewGame({ title: '', genre: '', platform: '' }) }
    } catch (err) { alert("Server error.") } finally { setIsAdding(false) }
  }

  const openGameModal = async (game) => {
    setSelectedGame(game)
    setReviews([])
    const token = localStorage.getItem("token")
    try {
      const response = await fetch(`http://127.0.0.1:8000/games/${game.id}/reviews`, { headers: { "Authorization": `Bearer ${token}` } })
      if (response.ok) setReviews(await response.json())
    } catch (err) { console.error("Failed to load reviews") }
  }

  const handleAddReview = async (e) => {
    e.preventDefault()
    setIsReviewing(true)
    const token = localStorage.getItem("token")
    try {
      const response = await fetch("http://127.0.0.1:8000/reviews", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ rating: newReview.rating, text: newReview.text, game_id: selectedGame.id })
      })
      if (response.ok) { setReviews([...reviews, await response.json()]); setNewReview({ rating: 5, text: '' }) }
    } catch (err) { alert("Server error.") } finally { setIsReviewing(false) }
  }

  const handleDeleteReview = async (reviewId) => {
    const token = localStorage.getItem("token")
    try {
      const response = await fetch(`http://127.0.0.1:8000/reviews/${reviewId}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } })
      if (response.ok) setReviews(reviews.filter(r => r.id !== reviewId))
    } catch (err) { alert("Server error.") }
  }

  // --- NEW: Enable 2FA ---
  const handleEnable2FA = async () => {
    const token = localStorage.getItem("token")
    try {
      const response = await fetch("http://127.0.0.1:8000/2fa/setup", {
        method: "POST", headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.uri) {
        setQrUri(data.uri)
        setIs2FASetupVisible(true)
      } else {
        alert(data.message) // Probably already enabled
      }
    } catch (err) {
      alert("Failed to setup 2FA.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-12 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-green-400">GameVault Dashboard</h1>
          <div className="flex items-center gap-4">
            {userData && <span className="text-gray-400 hidden sm:block">{userData.your_email}</span>}
            
            {/* 2FA SETUP BUTTON */}
            <button onClick={handleEnable2FA} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors">
              Lock Vault (2FA)
            </button>

            <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors">
              Logout
            </button>
          </div>
        </div>

        {error ? <p className="text-red-400 text-center text-xl mt-10">{error}</p> : !userData ? <p className="text-center text-gray-500 text-xl mt-10">Decrypting vault data...</p> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1 bg-gray-800 p-6 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-700 h-fit">
              <h2 className="text-xl font-bold text-green-400 mb-4 border-b border-gray-700 pb-2">Add New Game</h2>
              <form onSubmit={handleAddGame} className="space-y-4">
                <input type="text" required value={newGame.title} onChange={(e) => setNewGame({...newGame, title: e.target.value})} className="w-full p-2 bg-gray-700 rounded outline-none focus:ring-2 focus:ring-green-400" placeholder="Title (e.g. Hades)" />
                <input type="text" required value={newGame.genre} onChange={(e) => setNewGame({...newGame, genre: e.target.value})} className="w-full p-2 bg-gray-700 rounded outline-none focus:ring-2 focus:ring-green-400" placeholder="Genre" />
                <input type="text" required value={newGame.platform} onChange={(e) => setNewGame({...newGame, platform: e.target.value})} className="w-full p-2 bg-gray-700 rounded outline-none focus:ring-2 focus:ring-green-400" placeholder="Platform" />
                <button type="submit" disabled={isAdding} className="w-full bg-green-500 hover:bg-green-400 text-gray-900 font-bold p-2 rounded disabled:opacity-50">Add to Vault</button>
              </form>
            </div>

            <div className="col-span-1 md:col-span-2 bg-gray-800 p-6 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-gray-700">
              <h2 className="text-xl font-bold text-green-400 mb-4 border-b border-gray-700 pb-2">My Library ({games.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {games.map((game) => (
                  <div key={game.id} onClick={() => openGameModal(game)} className="bg-gray-700 p-4 rounded-lg border border-gray-600 hover:border-green-400 hover:shadow-[0_0_15px_rgba(74,222,128,0.3)] transition-all cursor-pointer">
                    <h3 className="text-lg font-bold text-white truncate">{game.title}</h3>
                    <div className="flex justify-between mt-3 text-xs font-mono uppercase"><span className="bg-gray-900 text-blue-400 px-2 py-1 rounded">{game.genre}</span><span className="bg-gray-900 text-purple-400 px-2 py-1 rounded">{game.platform}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- REVIEWS MODAL --- */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-gray-600 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-700 pb-4 mb-4">
              <div><h2 className="text-3xl font-bold text-green-400">{selectedGame.title}</h2><p className="text-gray-400 mt-1">{selectedGame.platform} • {selectedGame.genre}</p></div>
              <button onClick={() => setSelectedGame(null)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
            </div>
            <form onSubmit={handleAddReview} className="mb-8 bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-bold mb-3">Leave a Review</h3>
              <div className="flex gap-4 mb-3">
                <div className="w-1/4"><label className="block text-sm text-gray-400 mb-1">Rating / 5</label><input type="number" min="1" max="5" required value={newReview.rating} onChange={(e) => setNewReview({...newReview, rating: parseInt(e.target.value)})} className="w-full p-2 bg-gray-700 rounded text-center" /></div>
                <div className="w-3/4"><label className="block text-sm text-gray-400 mb-1">Your Thoughts</label><input type="text" required value={newReview.text} onChange={(e) => setNewReview({...newReview, text: e.target.value})} className="w-full p-2 bg-gray-700 rounded" /></div>
              </div>
              <button type="submit" disabled={isReviewing} className="bg-green-500 text-gray-900 font-bold py-2 px-4 rounded">{isReviewing ? "Submitting..." : "Post Review"}</button>
            </form>
            <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2">Community Reviews ({reviews.length})</h3>
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="bg-gray-700 p-4 rounded-lg relative group">
                  <div className="text-yellow-400 font-bold text-lg mb-1">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</div>
                  <p className="text-gray-200">{review.text}</p>
                  <button onClick={() => handleDeleteReview(review.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 font-bold">Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- 2FA SETUP MODAL --- */}
      {is2FASetupVisible && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-[0_0_30px_rgba(74,222,128,0.5)] border-2 border-green-400 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Vault Locked Successfully</h2>
            <p className="text-gray-400 mb-6 text-sm">Scan this code with Google Authenticator or Authy. You will need it the next time you log in.</p>
            
            <div className="bg-white p-4 inline-block rounded-xl mb-6">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} alt="2FA QR Code" />
            </div>

            <button 
              onClick={() => setIs2FASetupVisible(false)} 
              className="w-full bg-green-500 hover:bg-green-400 text-gray-900 font-bold p-3 rounded transition-colors"
            >
              I have saved the code
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard