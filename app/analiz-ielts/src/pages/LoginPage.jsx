import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)

  const navigate = useNavigate()

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError
        alert('Verification email sent! Check your inbox.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        navigate('/home')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50">
      {/* Dynamic Subtle Mesh Background (light theme) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-[5%] -top-[5%] h-[60%] w-[60%] animate-pulse rounded-full bg-blue-200/40 blur-[140px]" />
        <div className="absolute -right-[5%] -bottom-[5%] h-[60%] w-[60%] animate-pulse rounded-full bg-slate-200/50 blur-[140px] [animation-delay:2s]" />
        <div className="absolute top-[20%] left-[30%] h-[40%] w-[40%] animate-pulse rounded-full bg-indigo-200/30 blur-[160px] [animation-delay:4s]" />
        <div className="absolute bottom-[20%] right-[30%] h-[40%] w-[40%] animate-pulse rounded-full bg-gray-200/30 blur-[160px] [animation-delay:6s]" />
      </div>

      {/* Decorative Floating Blobs (light theme) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-[15%] left-[10%] h-32 w-32 bg-blue-200/40 rounded-full blur-3xl animate-bounce" />
        <div className="absolute bottom-[15%] right-[10%] h-32 w-32 bg-slate-200/50 rounded-full blur-3xl animate-bounce [animation-delay:3s]" />
      </div>

      <div className="relative z-20 w-full max-w-md px-6">
        <div className="overflow-hidden rounded-[40px] border border-gray-200 bg-white p-12 shadow-xl shadow-gray-200/60">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-8 flex items-center justify-center">
  <div className="text-center">
    <span className="text-2xl font-extrabold tracking-tight">
      <span className="text-red-600">IELTS</span>
      <span className="text-gray-900">in30days</span>
    </span>
  </div>
</div>

            <h1 className="text-4xl font-black tracking-tighter text-gray-900 sm:text-5xl">
              {isSignUp ? 'Get Started' : 'Welcome Back'}
            </h1>

            <p className="mt-4 text-lg text-gray-500 font-medium">
              {isSignUp ? 'Your IELTS success starts here.' : 'Sign in to your learning dashboard.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-8">
            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 font-semibold">
                <span className="text-lg">🚨</span> {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="group relative">
                <input
                  type="email"
                  required
                  className="peer w-full rounded-2xl border border-gray-300 bg-white px-6 py-5 text-gray-900 placeholder-transparent outline-none ring-0 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  id="email"
                />
                <label
                  htmlFor="email"
                  className="absolute left-6 top-5 text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-lg peer-focus:-top-3 peer-focus:text-sm peer-focus:font-bold peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-blue-600"
                >
                  Email Address
                </label>
              </div>

              <div className="group relative">
                <input
                  type="password"
                  required
                  className="peer w-full rounded-2xl border border-gray-300 bg-white px-6 py-5 text-gray-900 placeholder-transparent outline-none ring-0 transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="password"
                />
                <label
                  htmlFor="password"
                  className="absolute left-6 top-5 text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-lg peer-focus:-top-3 peer-focus:text-sm peer-focus:font-bold peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:-top-3 peer-[:not(:placeholder-shown)]:text-sm peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-blue-600"
                >
                  Password
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-blue-600 py-5 text-xl font-black text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-base font-bold text-blue-600 transition-all hover:text-blue-700 hover:tracking-wide underline decoration-blue-300 underline-offset-8 decoration-2 hover:decoration-blue-500"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Free"}
            </button>
          </div>
        </div>

        <p className="mt-12 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          Powered by DeepSeek AI • Enterprise Grade Security
        </p>
      </div>
    </div>
  )
}

export default LoginPage