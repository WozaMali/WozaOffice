import { supabase } from './supabase';

// Material mapping to connect UI materials with database materials
const MATERIAL_MAPPING = {
  'Aluminium': 'Aluminium Cans',
  'PET': 'PET',
  'Glass': 'Glass',
  'Paper': 'Paper',
  'Cardboard': 'Cardboard'
};

/**
 * Get database material ID from UI material name
 */
export async function getMaterialId(materialName: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('id')
      .eq('name', MATERIAL_MAPPING[materialName as keyof typeof MATERIAL_MAPPING] || materialName)
      .single();

    if (error || !data) {
      console.error('❌ Error finding material ID for:', materialName, error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('❌ Error in getMaterialId:', error);
    return null;
  }
}

/**
 * Get all available materials from the database
 */
export async function getAllMaterials() {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Error fetching materials:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in getAllMaterials:', error);
    throw error;
  }
}

/**
 * Get material by ID
 */
export async function getMaterialById(id: string) {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching material:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in getMaterialById:', error);
    throw error;
  }
}
