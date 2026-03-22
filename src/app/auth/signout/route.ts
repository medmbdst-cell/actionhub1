import { signout } from '@/app/actions/auth';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  await signout();
}
