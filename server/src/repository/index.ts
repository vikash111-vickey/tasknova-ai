import { Repository } from './interface';
import { LocalStore } from './localStore';
import { SupabaseStore } from './supabaseStore';

let repositoryInstance: Repository | null = null;

export function getRepository(): Repository {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  // During automated unit tests, isolate tests to LocalStore to avoid remote network latency
  if (process.env.NODE_ENV === 'test' && !process.env.USE_LIVE_SUPABASE_TESTS) {
    repositoryInstance = new LocalStore();
    return repositoryInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    console.log('[Repository] Initialized with SupabaseStore (Live Mode)');
    repositoryInstance = new SupabaseStore(supabaseUrl, supabaseKey);
  } else {
    console.log('[Repository] Initialized with LocalStore (Zero-Config JSON Mode)');
    repositoryInstance = new LocalStore();
  }

  return repositoryInstance;
}

export function resetRepository(): void {
  repositoryInstance = null;
}

export * from './interface';
export * from './localStore';
export * from './supabaseStore';
