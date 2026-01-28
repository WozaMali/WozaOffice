// ============================================================================
// SUPER ADMIN PROFILE COMPONENT
// ============================================================================
// React component for updating Super Admin information

import React, { useState, useEffect } from 'react'
import { updateSuperAdminInfo, getSuperAdminInfo } from './update-superadmin'

interface SuperAdminInfo {
  firstName: string
  lastName: string
  fullName: string
  phone: string
  employeeNumber: string
  township: string
  address: string
  workId: string
  dateOfBirth: string
  emergencyContact: string
  emergencyContactPhone: string
}

interface SuperAdminProfileProps {
  onUpdate?: (success: boolean, data?: any) => void
}

export default function SuperAdminProfile({ onUpdate }: SuperAdminProfileProps) {
  const [superAdminInfo, setSuperAdminInfo] = useState<SuperAdminInfo>({
    firstName: '',
    lastName: '',
    fullName: '',
    phone: '',
    employeeNumber: '',
    township: '',
    address: '',
    workId: '',
    dateOfBirth: '',
    emergencyContact: '',
    emergencyContactPhone: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Load current Super Admin information
  useEffect(() => {
    loadSuperAdminInfo()
  }, [])

  const loadSuperAdminInfo = async () => {
    setLoading(true)
    try {
      const result = await getSuperAdminInfo()
      
      if (result.success && result.data) {
        const data = result.data
        setSuperAdminInfo({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          fullName: data.full_name || '',
          phone: data.phone || '',
          employeeNumber: data.employee_number || '',
          township: data.township || '',
          address: data.address || '',
          workId: data.work_id || '',
          dateOfBirth: data.date_of_birth || '',
          emergencyContact: data.emergency_contact || '',
          emergencyContactPhone: data.emergency_contact_phone || ''
        })
      } else {
        setError(result.error || 'Failed to load Super Admin information')
      }
    } catch (err) {
      setError('Unexpected error loading Super Admin information')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSuperAdminInfo(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const result = await updateSuperAdminInfo(superAdminInfo)
      
      if (result.success) {
        setMessage('Super Admin information updated successfully!')
        if (onUpdate) {
          onUpdate(true, result.data)
        }
      } else {
        setError(result.error || 'Failed to update Super Admin information')
        if (onUpdate) {
          onUpdate(false, result.error)
        }
      }
    } catch (err) {
      setError('Unexpected error updating Super Admin information')
      if (onUpdate) {
        onUpdate(false, 'Unexpected error')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg">Loading Super Admin information...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Super Admin Profile</h1>
      
      {message && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={superAdminInfo.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={superAdminInfo.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={superAdminInfo.fullName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={superAdminInfo.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+27 11 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee Number
              </label>
              <input
                type="text"
                name="employeeNumber"
                value={superAdminInfo.employeeNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="EMP001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Township
              </label>
              <input
                type="text"
                name="township"
                value={superAdminInfo.township}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Johannesburg"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Additional Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                value={superAdminInfo.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Main Street, Johannesburg, 2000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work ID
              </label>
              <input
                type="text"
                name="workId"
                value={superAdminInfo.workId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="WOZA-ADMIN-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={superAdminInfo.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                name="emergencyContact"
                value={superAdminInfo.emergencyContact}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                name="emergencyContactPhone"
                value={superAdminInfo.emergencyContactPhone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+27 11 987 6543"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={loadSuperAdminInfo}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Update Super Admin'}
          </button>
        </div>
      </form>
    </div>
  )
}
