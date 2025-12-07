#!/bin/bash
# Script to update imports from Next.js to React Router and fix path aliases

find src -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i \
  -e "s|from 'next/navigation'|from 'react-router-dom'|g" \
  -e "s|from \"next/navigation\"|from \"react-router-dom\"|g" \
  -e "s|from 'next/link'|from 'react-router-dom'|g" \
  -e "s|from \"next/link\"|from \"react-router-dom\"|g" \
  -e "s|from 'next/image'|// TODO: Replace with standard img tag|g" \
  -e "s|from \"next/image\"|// TODO: Replace with standard img tag|g" \
  -e "s|useRouter|useNavigate|g" \
  -e "s|usePathname|useLocation|g" \
  -e "s|router\.push|navigate|g" \
  -e "s|router\.replace|navigate|g" \
  -e "s|Link from|// Link from|g" \
  -e "s|<Link |<a |g" \
  -e "s|</Link>|</a>|g" \
  -e "s|href=|to=|g" \
  -e "s|pathname|location.pathname|g" \
  -e "s|\"use client\"|// \"use client\" - removed for Vite|g" \
  -e "s|'use client'|// 'use client' - removed for Vite|g" \
  -e "s|from '../|from '@/|g" \
  -e "s|from '../../|from '@/|g" \
  -e "s|from '../../../|from '@/|g" \
  -e "s|from '../../../../|from '@/|g" \
  {} \;

echo "Import updates complete!"
