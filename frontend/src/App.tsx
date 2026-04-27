import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Dashboard from './components/Dashboard'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'oklch(17% 0.009 260)',
            color: 'oklch(91% 0.005 260)',
            border: '1px solid oklch(22% 0.011 260)',
            fontSize: '13px',
            borderRadius: '8px',
          },
        }}
      />
      <Dashboard />
    </QueryClientProvider>
  )
}
