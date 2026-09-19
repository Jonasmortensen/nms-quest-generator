import { useState } from 'react'

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

export function CopyPromptButton({ getText }) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await copyToClipboard(getText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.warn('Failed to copy prompt to clipboard', error)
    }
  }

  return (
    <button type="button" className="app__copy-prompt" onClick={handleClick}>
      {copied ? 'Copied!' : 'Copy AI Prompt'}
    </button>
  )
}
