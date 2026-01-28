// ============================================================================
// UPDATE SUPER ADMIN INFORMATION - JavaScript Function
// ============================================================================
// This script provides a JavaScript function to update Super Admin information

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Update Super Admin personal information
 * @param {Object} superAdminInfo - The Super Admin information to update
 * @param {string} superAdminInfo.firstName - First name
 * @param {string} superAdminInfo.lastName - Last name
 * @param {string} superAdminInfo.fullName - Full name
 * @param {string} superAdminInfo.phone - Phone number
 * @param {string} superAdminInfo.employeeNumber - Employee number
 * @param {string} superAdminInfo.township - Township
 * @param {string} superAdminInfo.address - Address
 * @param {string} superAdminInfo.workId - Work ID
 * @param {string} superAdminInfo.dateOfBirth - Date of birth (YYYY-MM-DD)
 * @param {string} superAdminInfo.emergencyContact - Emergency contact name
 * @param {string} superAdminInfo.emergencyContactPhone - Emergency contact phone
 * @returns {Promise<Object>} - Result of the update operation
 */
export async function updateSuperAdminInfo(superAdminInfo) {
  try {
    const superAdminId = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3'
    
    // Prepare the update data
    const updateData = {
      first_name: superAdminInfo.firstName,
      last_name: superAdminInfo.lastName,
      full_name: superAdminInfo.fullName,
      phone: superAdminInfo.phone,
      employee_number: superAdminInfo.employeeNumber,
      township: superAdminInfo.township,
      address: superAdminInfo.address,
      work_id: superAdminInfo.workId,
      date_of_birth: superAdminInfo.dateOfBirth,
      emergency_contact: superAdminInfo.emergencyContact,
      emergency_contact_phone: superAdminInfo.emergencyContactPhone,
      updated_at: new Date().toISOString()
    }
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    // Update the Super Admin information
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', superAdminId)
      .select()
    
    if (error) {
      console.error('Error updating Super Admin information:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
    
    console.log('Super Admin information updated successfully:', data)
    return {
      success: true,
      error: null,
      data: data[0]
    }
    
  } catch (error) {
    console.error('Unexpected error updating Super Admin information:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

/**
 * Get Super Admin current information
 * @returns {Promise<Object>} - Current Super Admin information
 */
export async function getSuperAdminInfo() {
  try {
    const superAdminId = 'b1b84587-6a12-43e9-85ef-d465cbf8ece3'
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        full_name,
        phone,
        employee_number,
        township,
        address,
        work_id,
        date_of_birth,
        emergency_contact,
        emergency_contact_phone,
        status,
        is_approved,
        created_at,
        updated_at,
        roles (
          name,
          permissions
        )
      `)
      .eq('id', superAdminId)
      .single()
    
    if (error) {
      console.error('Error fetching Super Admin information:', error)
      return {
        success: false,
        error: error.message,
        data: null
      }
    }
    
    return {
      success: true,
      error: null,
      data: data
    }
    
  } catch (error) {
    console.error('Unexpected error fetching Super Admin information:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

/**
 * Example usage of the update function
 */
export async function exampleUpdateSuperAdmin() {
  const superAdminInfo = {
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    phone: '+27 11 123 4567',
    employeeNumber: 'EMP001',
    township: 'Johannesburg',
    address: '123 Main Street, Johannesburg, 2000',
    workId: 'WOZA-ADMIN-001',
    dateOfBirth: '1990-01-01',
    emergencyContact: 'Jane Doe',
    emergencyContactPhone: '+27 11 987 6543'
  }
  
  const result = await updateSuperAdminInfo(superAdminInfo)
  
  if (result.success) {
    console.log('Super Admin updated successfully:', result.data)
  } else {
    console.error('Failed to update Super Admin:', result.error)
  }
  
  return result
}

// Export the functions for use in your application
export default {
  updateSuperAdminInfo,
  getSuperAdminInfo,
  exampleUpdateSuperAdmin
}
