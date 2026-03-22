import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  name: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  href?: string;
  color?: string;
  bgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatCard({
  name,
  value,
  description,
  icon: Icon,
  href,
  color = 'text-blue-600',
  bgColor = 'bg-blue-100',
  trend,
}: StatCardProps) {
  const content = (
    <div className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6">
      <dt>
        <div className={`absolute rounded-md ${bgColor} p-3`}>
          <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
        </div>
        <p className="ml-16 truncate text-sm font-medium text-gray-500">{name}</p>
      </dt>
      <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <p
            className={`ml-2 flex items-baseline text-sm font-semibold ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}%
          </p>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <span className="font-medium text-gray-600">{description}</span>
          </div>
        </div>
      </dd>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform hover:scale-105">
        {content}
      </Link>
    );
  }

  return content;
}
