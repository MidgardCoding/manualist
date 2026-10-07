import { type ReactNode } from 'react'

interface Props {
  children: ReactNode;
}

function LandingBackground({ children }: Props) {
  return (
    <main className="bg-[#fffaf0] bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(180,83,9,0.10),rgba(253,224,71,0.16)),repeating-linear-gradient(0deg,transparent_0px,transparent_31px,rgba(180,83,9,0.16)_32px),repeating-linear-gradient(90deg,transparent_0px,transparent_31px,rgba(245,158,11,0.16)_32px)] overflow-auto">
      { children }
    </main>
  )
}

export default LandingBackground