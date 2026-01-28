import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      idNumber,
      gender,
      addressLine1,
      addressLine2,
      suburb,
      city,
      province,
      postalCode,
      township,
      department,
      position,
      employmentStartDate,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      bankName,
      bankAccountNumber,
      bankAccountType,
      branchCode,
      notes
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Basic Information
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.date_of_birth = dateOfBirth || null;
    if (idNumber !== undefined) updateData.id_number = idNumber || null;
    if (gender !== undefined) updateData.gender = gender || null;

    // Address Information
    if (addressLine1 !== undefined) updateData.address_line1 = addressLine1;
    if (addressLine2 !== undefined) updateData.address_line2 = addressLine2 || null;
    if (suburb !== undefined) updateData.suburb = suburb || null;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province || null;
    if (postalCode !== undefined) updateData.postal_code = postalCode || null;
    if (township !== undefined) updateData.township = township || null;

    // Employment Information
    if (department !== undefined) updateData.department = department || null;
    if (position !== undefined) updateData.position = position || null;
    if (employmentStartDate !== undefined) updateData.employment_start_date = employmentStartDate || null;

    // Emergency Contact
    if (emergencyContactName !== undefined) updateData.emergency_contact_name = emergencyContactName;
    if (emergencyContactPhone !== undefined) updateData.emergency_contact_phone = emergencyContactPhone;
    if (emergencyContactRelationship !== undefined) updateData.emergency_contact_relationship = emergencyContactRelationship || null;

    // Banking Information
    if (bankName !== undefined) updateData.bank_name = bankName || null;
    if (bankAccountNumber !== undefined) updateData.bank_account_number = bankAccountNumber || null;
    if (bankAccountType !== undefined) updateData.bank_account_type = bankAccountType || null;
    if (branchCode !== undefined) updateData.branch_code = branchCode || null;

    // Additional
    if (notes !== undefined) updateData.notes = notes || null;

    // Update full_name from first_name and last_name
    if (firstName || lastName) {
      const currentData = await supabaseAdmin
        .from('users')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      const first = firstName || currentData.data?.first_name || '';
      const last = lastName || currentData.data?.last_name || '';
      updateData.full_name = `${first} ${last}`.trim();
    }

    // Check if all required fields are filled to mark form as completed
    const requiredFields = [
      updateData.first_name,
      updateData.last_name,
      updateData.phone,
      updateData.address_line1,
      updateData.city,
      updateData.emergency_contact_name,
      updateData.emergency_contact_phone
    ];

    const allRequiredFieldsFilled = requiredFields.every(field => field && field.trim() !== '');

    if (allRequiredFieldsFilled) {
      updateData.employee_form_completed = true;
      if (!updateData.employee_form_completed_at) {
        updateData.employee_form_completed_at = new Date().toISOString();
      }
    }

    // Update user profile
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating employee profile:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to update profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Employee profile updated successfully',
      data: {
        employee_form_completed: allRequiredFieldsFilled
      }
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

