'use client'

import { useState, useEffect } from 'react'
import { Lead } from '@/lib/types'
import { 
  Github, 
  Mail, 
  ExternalLink, 
  Calendar, 
  Users, 
  Send, 
  RefreshCw,
  CheckCircle,
  Clock,
  MessageCircle,
  Star
} from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [emailLoading, setEmailLoading] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'responded' | 'converted'>('all')

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads')
      const data = await response.json()
      if (data.success) {
        setLeads(data.leads)
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        setLeads(leads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        ))
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleEmailCampaign = async (dryRun: boolean = false) => {
    setEmailLoading(true)
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadIds: selectedLeads.length > 0 ? selectedLeads : undefined,
          dryRun 
        }),
      })
      
      const result = await response.json()
      if (result.success) {
        alert(result.message)
        if (!dryRun) {
          fetchLeads() // Refresh to see updated email_sent status
        }
      } else {
        alert(`Error: ${result.message}`)
      }
    } catch (error) {
      console.error('Error sending emails:', error)
      alert('Error sending emails')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id))
    }
  }

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const filteredLeads = leads.filter(lead => 
    filter === 'all' || lead.status === filter
  )

  const getStatusIcon = (status: Lead['status']) => {
    switch (status) {
      case 'new': return <Clock className="w-4 h-4 text-gray-500" />
      case 'contacted': return <Send className="w-4 h-4 text-blue-500" />
      case 'responded': return <MessageCircle className="w-4 h-4 text-green-500" />
      case 'converted': return <Star className="w-4 h-4 text-yellow-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-gray-100 text-gray-800'
      case 'contacted': return 'bg-blue-100 text-blue-800'
      case 'responded': return 'bg-green-100 text-green-800'
      case 'converted': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading leads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Leads Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your n8n workflow leads and outreach campaigns
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
            <button
              onClick={() => handleEmailCampaign(true)}
              disabled={emailLoading}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {emailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Dry Run Email'}
            </button>
            <button
              onClick={() => handleEmailCampaign(false)}
              disabled={emailLoading || selectedLeads.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {emailLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : `Send Email (${selectedLeads.length})`}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Leads</p>
                <p className="text-2xl font-bold">{leads.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">With Email</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.email).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <Send className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Emails Sent</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.email_sent).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Converted</p>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'converted').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-2">
            {(['all', 'new', 'contacted', 'responded', 'converted'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({leads.filter(l => status === 'all' || l.status === status).length})
              </button>
            ))}
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Repository
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Github className="w-4 h-4 mr-2" />
                        <a
                          href={`https://github.com/${lead.github_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          {lead.github_username}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <a
                          href={lead.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                        >
                          {lead.repo_name}
                        </a>
                        {lead.repo_description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {lead.repo_description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.email ? (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-green-600" />
                          <span className="text-sm">{lead.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No email</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(lead.status)}
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusUpdate(lead.id, e.target.value as Lead['status'])}
                          className={`ml-2 px-2 py-1 text-xs rounded-full border-0 ${getStatusColor(lead.status)}`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="responded">Responded</option>
                          <option value="converted">Converted</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(lead.last_activity).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={lead.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLeads.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No leads found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 