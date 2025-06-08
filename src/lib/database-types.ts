// Tipos TypeScript generados para la base de datos
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string | null
        }
      }
      pets: {
        Row: {
          id: string
          name: string
          type: string
          breed: string | null
          owner_name: string
          owner_contact: string
          notes: string | null
          created_at: string | null
          user_id: string
          tag_id: string | null
          qr_activated: boolean | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          breed?: string | null
          owner_name: string
          owner_contact: string
          notes?: string | null
          created_at?: string | null
          user_id: string
          tag_id?: string | null
          qr_activated?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          breed?: string | null
          owner_name?: string
          owner_contact?: string
          notes?: string | null
          created_at?: string | null
          user_id?: string
          tag_id?: string | null
          qr_activated?: boolean | null
        }
      }
      tags: {
        Row: {
          id: string
          code: string
          activated: boolean | null
          activated_at: string | null
          pet_id: string | null
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          activated?: boolean | null
          activated_at?: string | null
          pet_id?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          activated?: boolean | null
          activated_at?: string | null
          pet_id?: string | null
          user_id?: string | null
          created_at?: string | null
        }
      }
      medical_records: {
        Row: {
          id: string
          pet_id: string
          record_date: string
          description: string
          diagnosis: string | null
          treatment: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pet_id: string
          record_date: string
          description: string
          diagnosis?: string | null
          treatment?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          record_date?: string
          description?: string
          diagnosis?: string | null
          treatment?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      vaccinations: {
        Row: {
          id: string
          pet_id: string
          vaccine_name: string
          application_date: string
          next_due_date: string | null
          vet_name: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pet_id: string
          vaccine_name: string
          application_date: string
          next_due_date?: string | null
          vet_name?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          vaccine_name?: string
          application_date?: string
          next_due_date?: string | null
          vet_name?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      medications: {
        Row: {
          id: string
          pet_id: string
          name: string
          dosage: string
          frequency: string
          start_date: string
          end_date: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pet_id: string
          name: string
          dosage: string
          frequency: string
          start_date: string
          end_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          name?: string
          dosage?: string
          frequency?: string
          start_date?: string
          end_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      photos: {
        Row: {
          id: string
          pet_id: string
          url: string
          description: string | null
          taken_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pet_id: string
          url: string
          description?: string | null
          taken_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          url?: string
          description?: string | null
          taken_at?: string | null
          created_at?: string | null
        }
      }
      lost_pets: {
        Row: {
          id: string
          pet_id: string
          last_seen_date: string
          last_seen_location: string
          description: string | null
          contact_info: string
          is_found: boolean | null
          found_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pet_id: string
          last_seen_date: string
          last_seen_location: string
          description?: string | null
          contact_info: string
          is_found?: boolean | null
          found_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          last_seen_date?: string
          last_seen_location?: string
          description?: string | null
          contact_info?: string
          is_found?: boolean | null
          found_date?: string | null
          created_at?: string | null
        }
      }
      vet_visits: {
        Row: {
          id: string
          pet_id: string
          visit_date: string
          vet_name: string
          reason: string
          diagnosis: string | null
          treatment: string | null
          next_visit_date: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          pet_id: string
          visit_date: string
          vet_name: string
          reason: string
          diagnosis?: string | null
          treatment?: string | null
          next_visit_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          visit_date?: string
          vet_name?: string
          reason?: string
          diagnosis?: string | null
          treatment?: string | null
          next_visit_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
    }
  }
}