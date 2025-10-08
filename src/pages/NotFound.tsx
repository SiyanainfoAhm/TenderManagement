import { useNavigate } from 'react-router-dom'
import Button from '@/components/base/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6">
          <i className="ri-error-warning-line text-6xl text-gray-400"></i>
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline">
            <i className="ri-arrow-left-line mr-2"></i>
            Go Back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            <i className="ri-home-line mr-2"></i>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

