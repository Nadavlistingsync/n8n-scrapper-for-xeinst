import Link from 'next/link'
import { Github, Mail, Database, Users } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            N8N Scraper
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Discover and connect with n8n workflow creators for Xeinst platform
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/leads"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              View Leads
            </Link>
            <Link
              href="/api/scrape"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Start Scraping
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Github className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">GitHub Integration</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Search and analyze n8n repositories automatically
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Users className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Lead Discovery</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Find active developers with n8n workflows
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Mail className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Email Outreach</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Automated email campaigns via Resend
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Database className="w-12 h-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Data Management</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Store and manage leads in Supabase
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8">Recent Activity</h2>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Check the leads dashboard to see scraped repositories and manage outreach campaigns.
            </p>
            <Link
              href="/leads"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 