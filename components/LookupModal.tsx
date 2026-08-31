'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCodeIcon, CloseIcon, ArrowRightIcon, AlertCircleIcon } from '@/components/Icons'
import Mascot from './Mascot'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function LookupModal({ isOpen, onClose }: Props) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  if (!isOpen) return null

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!clean) {
      setError('Masukkan 6 digit kode sesi fotomu.')
      return
    }

    setIsSearching(true)
    setError('')

    try {
      const res = await fetch(`/api/sessions?shareCode=${clean}`)
      if (res.ok) {
        onClose()
        router.push(`/result/${clean}`)
      } else {
        // Even if API doesn't have it (e.g. offline session storage), attempt navigating
        onClose()
        router.push(`/result/${clean}`)
      }
    } catch {
      onClose()
      router.push(`/result/${clean}`)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(12, 30, 20, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '24px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '440px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(12, 30, 20, 0.25)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          aria-label="Tutup modal"
        >
          <CloseIcon size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <Mascot pose="searching" size="sm" animated={false} />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Cek Hasil Foto Sesi
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Masukkan 6 digit kode unik share photobooth
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              htmlFor="share-code-input"
              style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px' }}
            >
              Kode Share / Sesi
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="share-code-input"
                type="text"
                maxLength={10}
                placeholder="Contoh: A8K9X2"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--bg-primary)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <QrCodeIcon size={18} />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error)', fontSize: '0.8125rem' }}>
              <AlertCircleIcon size={15} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isSearching}
            style={{ marginTop: '6px' }}
          >
            <span>{isSearching ? 'Mencari Foto...' : 'Buka Hasil Foto'}</span>
            <ArrowRightIcon size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
