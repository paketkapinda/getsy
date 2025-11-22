import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database'; // ✅ Artık çalışacak

export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies });
};
