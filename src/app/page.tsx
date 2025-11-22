// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">
              Georgia Tours
            </div>
            <div className="flex space-x-4">
              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
              <Link href="/auth/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Discover Georgia Like Never Before
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Your all-in-one platform for hotels, restaurants, real estate, and unforgettable experiences in beautiful Georgia.
        </p>
        <div className="flex justify-center space-x-4">
          <Link 
            href="/auth/register" 
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
          <Link 
            href="/download" 
            className="border border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            Download App
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">🏨</div>
            <h3 className="text-xl font-semibold mb-4">Hotel Bookings</h3>
            <p className="text-gray-600">
              Find and book the perfect accommodation with real-time availability and instant confirmation.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">🍕</div>
            <h3 className="text-xl font-semibold mb-4">Restaurant Orders</h3>
            <p className="text-gray-600">
              Order from top restaurants with live order tracking and multiple payment options.
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold mb-4">Real Estate</h3>
            <p className="text-gray-600">
              Explore property listings and connect with verified real estate agents.
            </p>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Get the Mobile App</h2>
          <p className="text-xl mb-8 opacity-90">
            Download our app for the best experience on your mobile device.
          </p>
          <div className="flex justify-center space-x-6">
            <a href="#" className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
              Download for iOS
            </a>
            <a href="#" className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100">
              Download for Android
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">Georgia Tours</h4>
              <p className="text-gray-400">
                Your trusted travel companion in Georgia.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Hotel Bookings</li>
                <li>Restaurant Orders</li>
                <li>Real Estate</li>
                <li>Car Rentals</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Download</h4>
              <div className="space-y-2">
                <a href="#" className="block text-gray-400 hover:text-white">iOS App</a>
                <a href="#" className="block text-gray-400 hover:text-white">Android App</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Georgia Tours Super App. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}