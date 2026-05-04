import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const HomePage = () => {
  const { signOut, user } = useAuth()

  return (
    <div className="app-bg p-8">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          <span className="text-red-600">IELTS</span>
          <span className="text-gray-900">in30days</span>
        </h1>

        <div className="flex items-center gap-4">
          <span className="app-muted">{user?.email}</span>
          <button
            onClick={signOut}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-2xl font-semibold text-gray-900">
          Dashboard
        </h2>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          
          {/* Plan Card */}
          <Link
            to="/plan"
            className="app-card group relative overflow-hidden p-8 transition hover:shadow-md"
          >
            <div className="text-2xl mb-2">📅</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Your Plan
            </h3>
            <p className="app-muted text-sm">
              View your daily study schedule and track your progress.
            </p>
          </Link>

          {/* Mock Tests Card */}
          <Link
            to="/mock-tests"
            className="app-card group relative overflow-hidden p-8 transition hover:shadow-md"
          >
            <div className="text-2xl mb-2">📝</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Mock Tests
            </h3>
            <p className="app-muted text-sm">
              Practice with full-length IELTS mock exams.
            </p>
          </Link>

          {/* Performance Card */}
          <Link
            to="/performance"
            className="app-card group relative overflow-hidden p-8 transition hover:shadow-md"
          >
            <div className="text-2xl mb-2">📈</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Performance
            </h3>
            <p className="app-muted text-sm">
              See your Writing/Speaking band history.
            </p>
          </Link>

          {/* Exercises Card */}
          <Link
            to="/exercises"
            className="app-card group relative overflow-hidden p-8 transition hover:shadow-md"
          >
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Exercises
            </h3>
            <p className="app-muted text-sm">
              Practice Reading, Listening, and Writing drills freely.
            </p>
          </Link>

        </div>
      </main>
    </div>
  )
}

export default HomePage