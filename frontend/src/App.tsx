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
            background: '#241a3a',
            color: '#ffffff',
            border: '1px solid #362d59',
            fontSize: '13px',
            borderRadius: '8px',
          },
        }}
      />
      <Dashboard />
    </QueryClientProvider>
  )
}
