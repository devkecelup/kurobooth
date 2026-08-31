import { Suspense } from 'react'
import ResultPageInner from './ResultPage'

interface Props {
  params: Promise<{ shareCode: string }>
}

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      color: 'rgba(244,244,248,0.6)',
      fontFamily: 'Inter, sans-serif',
      background: '#080810',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#A78BFA',
        animation: 'spin 1s linear infinite',
      }} />
      <p>Memuat hasil fotomu...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function ResultPage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultPageInner params={params} />
    </Suspense>
  )
}
