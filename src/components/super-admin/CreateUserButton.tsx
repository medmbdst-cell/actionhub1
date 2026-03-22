'use client';

import { useState } from 'react';
import CreateUserModal from './CreateUserModal';
import type { Tenant } from '@/types';

interface CreateUserButtonProps {
  tenants: Tenant[];
}

export default function CreateUserButton({ tenants }: CreateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg
          className="-ml-1 mr-2 h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Nouvel utilisateur
      </button>

      <CreateUserModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tenants={tenants}
      />
    </>
  );
}
