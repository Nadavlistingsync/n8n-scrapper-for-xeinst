#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const axios = require('axios')

async function testInstantlyAPI() {
  const apiKey = process.env.INSTANTLY_API_KEY
  
  if (!apiKey) {
    console.log('❌ INSTANTLY_API_KEY not found')
    return
  }

  console.log('🔍 Testing Instantly API endpoints...\n')

  // Try different authentication methods
  const authMethods = [
    { 'Authorization': `Bearer ${apiKey}` },
    { 'X-API-Key': apiKey },
    { 'api-key': apiKey },
    { 'x-api-key': apiKey }
  ]

  const baseURLs = [
    'https://api.instantly.ai',
    'https://api.instantly.ai/api',
    'https://api.instantly.ai/api/v1',
    'https://instantly.ai/api',
    'https://instantly.ai/api/v1'
  ]

  const endpoints = [
    '/campaigns',
    '/campaign/list',
    '/campaigns/list',
    '/leads',
    '/leads/list',
    '/user',
    '/account',
    '/workspace'
  ]

  for (const baseURL of baseURLs) {
    for (const authMethod of authMethods) {
      for (const endpoint of endpoints) {
        const url = `${baseURL}${endpoint}`
        const headers = {
          ...authMethod,
          'Content-Type': 'application/json'
        }

        try {
          console.log(`🔍 Testing: ${url}`)
          console.log(`   Auth: ${Object.keys(authMethod)[0]}`)
          
          const response = await axios.get(url, { headers })
          console.log(`✅ SUCCESS: ${url}`)
          console.log(`📊 Status: ${response.status}`)
          console.log(`📊 Response:`, JSON.stringify(response.data, null, 2))
          console.log('')
          return // Found working endpoint
        } catch (error) {
          if (error.response?.status === 401) {
            console.log(`🔑 AUTH WORKING but endpoint wrong: ${url}`)
            console.log(`   Status: ${error.response.status}`)
            console.log('')
          } else if (error.response?.status === 404) {
            // Silently skip 404s
          } else {
            console.log(`❌ FAILED: ${url} - ${error.response?.status} ${error.response?.statusText}`)
            if (error.response?.data) {
              console.log(`   Error:`, error.response.data)
            }
            console.log('')
          }
        }
      }
    }
  }

  console.log('🔍 Testing POST endpoints with working auth...\n')
  
  // Try POST endpoints with the auth method that worked
  const postEndpoints = [
    '/lead/add',
    '/leads/add',
    '/campaign/create',
    '/campaigns/create'
  ]

  for (const baseURL of baseURLs) {
    for (const authMethod of authMethods) {
      for (const endpoint of postEndpoints) {
        const url = `${baseURL}${endpoint}`
        const headers = {
          ...authMethod,
          'Content-Type': 'application/json'
        }

        try {
          console.log(`🔍 Testing POST: ${url}`)
          console.log(`   Auth: ${Object.keys(authMethod)[0]}`)
          
          const response = await axios.post(url, {
            test: true
          }, { headers })
          console.log(`✅ SUCCESS: ${url}`)
          console.log(`📊 Status: ${response.status}`)
          console.log(`📊 Response:`, JSON.stringify(response.data, null, 2))
          console.log('')
          return // Found working endpoint
        } catch (error) {
          if (error.response?.status === 401) {
            console.log(`🔑 AUTH WORKING but endpoint wrong: ${url}`)
            console.log(`   Status: ${error.response.status}`)
            console.log('')
          } else if (error.response?.status === 404) {
            // Silently skip 404s
          } else {
            console.log(`❌ FAILED: ${url} - ${error.response?.status} ${error.response?.statusText}`)
            if (error.response?.data) {
              console.log(`   Error:`, error.response.data)
            }
            console.log('')
          }
        }
      }
    }
  }
}

testInstantlyAPI()
