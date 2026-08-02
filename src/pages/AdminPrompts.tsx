import { useState } from 'react'
import type { AdminPromptsGetResponse, AdminPromptsPostResponse, PromptConfig } from '../types/admin'
import {
  ANALYZE_INSTRUCTIONS_MAX,
  RENDER_INSTRUCTIONS_MAX,
  BRIEF_INSTRUCTIONS_MAX
} from '../types/admin'
import Logo from '../components/Logo'
import { PrimaryButton, SecondaryButton, StepEyebrow } from '../components/widget/ui'

interface Message {
  type: 'info' | 'erreur'
  texte: string
}

const CHAMP =
  'w-full border border-white/10 bg-[#1A1A1A] p-4 font-mono text-[12.5px] leading-relaxed text-white outline-none transition-colors focus:border-sable/60'

/**
 * Outil interne : édition des prompts du pipeline IA sans redéploiement.
 * Mot de passe partagé (header x-admin-password) — page hors flow du widget.
 */
export default function AdminPrompts() {
  const [motDePasse, setMotDePasse] = useState('')
  const [deverrouille, setDeverrouille] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [analyze, setAnalyze] = useState('')
  const [render, setRender] = useState('')
  const [brief, setBrief] = useState('')
  const [defauts, setDefauts] = useState<PromptConfig | null>(null)

  const charger = async () => {
    setOccupe(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/prompts', {
        headers: { 'x-admin-password': motDePasse }
      })
      if (res.status === 401) {
        setMessage({ type: 'erreur', texte: 'Mot de passe invalide.' })
        return
      }
      const json = (await res.json()) as AdminPromptsGetResponse | { ok: false; error: string }
      if (!json.ok) {
        setMessage({ type: 'erreur', texte: json.error })
        return
      }
      setAnalyze(json.config.analyzeInstructions)
      setRender(json.config.renderInstructions)
      setBrief(json.config.briefInstructions)
      setDefauts(json.defaults)
      setDeverrouille(true)
    } catch {
      setMessage({ type: 'erreur', texte: 'Serveur injoignable.' })
    } finally {
      setOccupe(false)
    }
  }

  const enregistrer = async () => {
    setOccupe(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': motDePasse },
        body: JSON.stringify({
          analyzeInstructions: analyze,
          renderInstructions: render,
          briefInstructions: brief
        })
      })
      const json = (await res.json()) as AdminPromptsPostResponse
      setMessage(
        json.ok
          ? { type: 'info', texte: 'Enregistré — appliqué immédiatement, sans redéploiement.' }
          : { type: 'erreur', texte: json.error }
      )
    } catch {
      setMessage({ type: 'erreur', texte: 'Serveur injoignable.' })
    } finally {
      setOccupe(false)
    }
  }

  const restaurer = () => {
    if (!defauts) return
    setAnalyze(defauts.analyzeInstructions)
    setRender(defauts.renderInstructions)
    setBrief(defauts.briefInstructions)
    setMessage({
      type: 'info',
      texte: 'Valeurs par défaut restaurées — cliquez Enregistrer pour les appliquer.'
    })
  }

  return (
    <div className="min-h-screen bg-noir-encre px-5 py-10 text-white">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-10 flex flex-col items-center">
          <Logo large className="text-white" />
          <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.22em] text-sable">
            Administration des prompts IA
          </p>
        </div>

        {!deverrouille ? (
          <div className="mx-auto max-w-[380px] space-y-4">
            <StepEyebrow>Accès restreint</StepEyebrow>
            <input
              type="password"
              className={CHAMP}
              placeholder="Mot de passe administrateur"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void charger()
              }}
            />
            {message?.type === 'erreur' && (
              <p className="font-sans text-[12px] text-red-300">{message.texte}</p>
            )}
            <PrimaryButton onClick={() => void charger()} disabled={occupe}>
              {occupe ? 'Vérification…' : 'Accéder'}
            </PrimaryButton>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <StepEyebrow>1 · Lecture de la demande client (analyse)</StepEyebrow>
              <textarea
                className={CHAMP}
                rows={12}
                maxLength={ANALYZE_INSTRUCTIONS_MAX}
                value={analyze}
                onChange={(e) => setAnalyze(e.target.value)}
              />
              <p className="mt-2 font-sans text-[11px] font-light text-gris-texte">
                Section « TÂCHES » du prompt d'analyse : familles, occasion, matière, couleur,
                budget, coupe. Placeholders : {'{{DEMANDE}}'}, {'{{CATEGORIES}}'}, {'{{OCCASIONS}}'},{' '}
                {'{{MATIERES}}'}, {'{{COULEURS}}'}, {'{{MOTS_CLES}}'}. Le schéma JSON de sortie et le
                filtrage sur le vocabulaire du catalogue sont verrouillés côté code.
              </p>
            </section>

            <section>
              <StepEyebrow>2 · Essayage virtuel sur la photo du client (rendu)</StepEyebrow>
              <textarea
                className={CHAMP}
                rows={10}
                maxLength={RENDER_INSTRUCTIONS_MAX}
                value={render}
                onChange={(e) => setRender(e.target.value)}
              />
              <p className="mt-2 font-sans text-[11px] font-light text-gris-texte">
                Consignes de réalisme textile (tombé, matière, plis, lumière, ombres,
                superposition). Placeholders : {'{{NOTES}}'}, {'{{PIECES}}'}. La correspondance pièce ↔
                partie du corps remplacée, et l'interdiction de modifier le visage, la morphologie et le
                décor, sont ajoutées automatiquement autour de ce texte et ne peuvent pas être cassées
                d'ici. Le rendu utilise Nano Banana Pro (Gemini 3 Pro Image).
              </p>
            </section>

            <section>
              <StepEyebrow>3 · Reformulation du besoin (brief)</StepEyebrow>
              <textarea
                className={CHAMP}
                rows={9}
                maxLength={BRIEF_INSTRUCTIONS_MAX}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
              <p className="mt-2 font-sans text-[11px] font-light text-gris-texte">
                Reformulation du besoin + une phrase de conseil, à l'étape de validation avant la
                sélection. Placeholders : {'{{DEMANDE}}'}, {'{{CRITERES}}'}, {'{{CATEGORIES}}'}. Le format
                JSON de sortie est verrouillé côté code.
              </p>
            </section>

            {message && (
              <p
                className={`font-sans text-[12px] ${
                  message.type === 'info' ? 'text-sable' : 'text-red-300'
                }`}
              >
                {message.texte}
              </p>
            )}

            <div className="space-y-3 pt-2">
              <PrimaryButton onClick={() => void enregistrer()} disabled={occupe}>
                {occupe ? 'Enregistrement…' : 'Enregistrer'}
              </PrimaryButton>
              <SecondaryButton onClick={restaurer}>Restaurer les valeurs par défaut</SecondaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
