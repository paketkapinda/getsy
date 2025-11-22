import { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
}

export function Table({ children }: TableProps) {
  return (
    <table className="w-full border-collapse border border-gray-200">
      {children}
    </table>
  );
}