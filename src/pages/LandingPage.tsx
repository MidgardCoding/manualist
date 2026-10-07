import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Camera, CheckCircle2, FileText, Glasses,
  Languages, ListChecks, Menu, MessageCircleHeart, ScanSearch,
  ShieldCheck, Sparkles, TextCursorInput, UploadCloud, X,
} from 'lucide-react';
import { useState } from 'react';
import Reveal from '../components/Reveal';
import LandingBackground from '../components/LandingBackground';
import TopBanner from '../components/TopBanner';
import Footer from '../components/Footer';

export function LandingNav({ homeBase = "" }: { homeBase?: string }) {
  const [open, setOpen] = useState(false);
  const section = (hash: string) => `${homeBase}${hash}`;
  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6">
      <div className="navbar mx-auto max-w-6xl rounded-2xl bg-base-100/90 backdrop-blur border border-base-300 shadow-lg px-3 sm:px-4">
        <div className="navbar-start">
          <a href="/" className="btn btn-ghost text-xl font-extrabold px-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-content text-lg font-black" aria-hidden>M</span>
            Manualist
          </a>
        </div>
        <nav className="navbar-center hidden md:flex gap-1 text-base" aria-label="Primary">
          <a href={section("#problems")} className="btn btn-ghost rounded-full">Why Manualist</a>
          <a href={section("#how-it-works")} className="btn btn-ghost rounded-full">How it works</a>
          <a href={section("#comfort")} className="btn btn-ghost rounded-full">Easy to read</a>
          <a href={section("#pricing")} className="btn btn-ghost rounded-full">Pricing</a>
        </nav>
        <div className="navbar-end hidden md:flex items-center gap-2">
          <a href="/login" className="btn btn-ghost rounded-full text-base">Log in</a>
          <a href="/register" className="btn btn-primary rounded-full text-base text-amber-900 font-bold">Get started - it's easy</a>
        </div>
        <div className="navbar-end md:hidden flex items-center gap-1">
          <button className="btn btn-ghost btn-circle" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden mx-auto mt-2 max-w-6xl rounded-2xl bg-base-100 border border-base-300 shadow-xl p-3 flex flex-col gap-1 text-lg" aria-label="Mobile">
          <a href={section("#problems")} onClick={() => setOpen(false)} className="btn btn-ghost justify-start">Why Manualist</a>
          <a href={section("#how-it-works")} onClick={() => setOpen(false)} className="btn btn-ghost justify-start">How it works</a>
          <a href={section("#comfort")} onClick={() => setOpen(false)} className="btn btn-ghost justify-start">Easy to read</a>
          <a href={section("#pricing")} onClick={() => setOpen(false)} className="btn btn-ghost justify-start">Pricing</a>
          <div className="flex gap-2 pt-2">
            <a href="/login" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 border border-base-300">Log in</a>
            <a href="/register" onClick={() => setOpen(false)} className="btn btn-primary flex-1 font-bold text-amber-900">Get started</a>
          </div>
        </nav>
      )}
    </header>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const } }),
};

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const pulse = reduceMotion ? undefined : { scale: [1, 1.12, 1] };
  const floatA = reduceMotion ? undefined : { y: [0, -12, 0] };
  const floatB = reduceMotion ? undefined : { y: [0, 12, 0] };
  return (
    <div className="min-h-screen text-base-content manualist-grid-bg overflow-x-clip">
      <TopBanner />
      <LandingNav />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 my-6 sm:pt-16 pb-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-base-100 border border-base-300 px-4 py-2 text-base shadow-sm">
              <Sparkles className="w-5 h-5 text-warning" aria-hidden />
              <span><b>Manualist</b> — your friendly manual helper</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight">
              Stop fighting your appliance manuals.
            </h1>
            <p className="text-xl sm:text-2xl leading-relaxed opacity-80 max-w-xl">
              Upload any manual, photo, or PDF. Manualist scans it and turns confusing booklets into plain, large-print guidance — then chats with you until everything is clear.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/register" className="btn btn-primary btn-lg rounded-2xl text-amber-900 text-xl font-bold shadow-lg">
                Try Manualist free <ArrowRight className="w-6 h-6" />
              </a>
              <a href="#how-it-works" className="btn btn-lg rounded-2xl border-2 border-base-300 bg-base-100 text-xl">
                See how easy it is
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-base opacity-75">
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-success" /> No tech jargon</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-success" /> Big, readable text</li>
              <li className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-success" /> 10 free credits to start</li>
            </ul>
          </motion.div>

          {/* Hero visual: 3-step mini demo */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="relative">
            <div className="card bg-base-100 border border-base-300 shadow-2xl rounded-3xl p-5 sm:p-6 space-y-4" role="img" aria-label="Preview: upload a manual, Manualist scans it, then you chat about it">
              <div className="flex items-center gap-3 rounded-2xl bg-base-200 p-4">
                <span className="badge badge-warning badge-lg font-bold">1</span>
                <UploadCloud className="w-8 h-8 text-primary" aria-hidden />
                <div>
                  <p className="font-bold text-lg leading-tight">Upload your manual</p>
                  <p className="opacity-70">Photo, PDF, or pasted text</p>
                </div>
              </div>
              <div className="flex justify-center" aria-hidden><span className="text-2xl">↓</span></div>
              <div className="flex items-center gap-3 rounded-2xl bg-base-200 p-4">
                <span className="badge badge-warning badge-lg font-bold">2</span>
                <motion.span animate={pulse} transition={pulse ? { repeat: Infinity, duration: 2.2 } : undefined} className="inline-flex">
                  <ScanSearch className="w-8 h-8 text-primary" aria-hidden />
                </motion.span>
                <div>
                  <p className="font-bold text-lg leading-tight">Manualist scans it</p>
                  <p className="opacity-70">Summary, contents &amp; to-do list appear</p>
                </div>
              </div>
              <div className="flex justify-center" aria-hidden><span className="text-2xl">↓</span></div>
              <div className="space-y-2 rounded-2xl bg-base-200 p-4">
                <div className="flex items-center gap-2 text-base font-bold opacity-70">
                  <span className="badge badge-warning badge-lg">3</span>
                  <MessageCircleHeart className="w-6 h-6" aria-hidden /> Chat with your helper
                </div>
                <div className="chat chat-end">
                  <div className='max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm bg-warning text-warning-content rounded-br-sm'>There&apos;s a red light blinking… what do I do?</div>
                </div>
                <div className='chat chat-start'>
                  <div className='max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm bg-white border border-gray-100 rounded-bl-sm'>No need to stress! That light means the filter needs a rinse. Here are 3 gentle steps…</div>
                </div>
              </div>
            </div>
            <motion.div aria-hidden className="absolute -z-10 -top-6 -right-6 h-40 w-40 rounded-full bg-primary/30 blur-2xl" animate={floatA} transition={floatA ? { repeat: Infinity, duration: 7 } : undefined} />
            <motion.div aria-hidden className="absolute -z-10 -bottom-8 -left-6 h-48 w-48 rounded-full bg-warning/25 blur-2xl" animate={floatB} transition={floatB ? { repeat: Infinity, duration: 8 } : undefined} />
          </motion.div>
        </div>
      </section>

      {/* PROBLEMS */}
      <LandingBackground>
      <section id="problems" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 my-6 scroll-mt-24">
        <Reveal className="text-center max-w-3xl mx-auto">
          <p className="text-base font-bold uppercase tracking-widest text-warning">We know the feeling</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Manuals are hard. Manualist makes them human.</h2>
          <p className="text-lg opacity-75 mt-3">You buy something new, a problem pops up, and the booklet is full of tiny print and strange words. Your Manualist guide turns that gibberish into a calm, easy guide.</p>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mt-8">
          {[
            { icon: BookOpen, title: '100-page booklet', text: 'Turns into a short, clear summary with only what matters.', img: true },
            { icon: Languages, title: 'Foreign languages', text: 'Explained back to you in plain words you actually use.', img: false },
            { icon: Glasses, title: 'Tiny, unreadable font', text: 'Rewritten big, bright, and step-by-step for tired eyes.', img: false },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <div className="card bg-base-100 border border-base-300 shadow-lg rounded-3xl p-6 text-center h-full hover:shadow-xl hover:-translate-y-1 transition">
                <span className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"><c.icon className="w-10 h-10 text-primary" aria-hidden /></span>
                <h3 className="text-xl font-bold mt-4">{c.title}</h3>
                <p className="opacity-75 mt-2">{c.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      </LandingBackground>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 scroll-mt-24">
        <Reveal className="text-center max-w-3xl mx-auto">
          <p className="text-base font-bold uppercase tracking-widest text-warning">How Manualist works</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Three tiny steps. Zero headache.</h2>
          <p className="text-lg opacity-75 mt-3">If you can take a photo or attach a file, you already know how to use Manualist.</p>
        </Reveal>

        <ol className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-8 list-none p-0">
          {[
            { n: '1', icon: UploadCloud, title: 'Upload your manual', text: 'Snap photos of pages, pick a PDF you found online, or paste the text. Big buttons, no confusing options.' },
            { n: '2', icon: ScanSearch, title: 'Let your helper scan it', text: 'Manualist reads everything and prepares a summary, a table of contents, and a gentle to-do list.' },
            { n: '3', icon: MessageCircleHeart, title: 'Talk it through', text: 'Ask in your own words — “how do I clean the filter?” — and get patient, step-by-step answers.' },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <li className="card bg-base-100 border-2 border-base-300 rounded-3xl p-6 sm:p-8 h-full relative overflow-hidden">
                <span className="absolute -top-3 -right-2 text-[6rem] font-black opacity-10 select-none" aria-hidden>{s.n}</span>
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-warning text-warning-content shadow"><s.icon className="w-8 h-8" aria-hidden /></span>
                <h3 className="text-xl font-bold mt-4">Step {s.n}: {s.title}</h3>
                <p className="opacity-75 mt-2">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>

        {/* Input -> output flow */}
        <Reveal className="mt-8">
          <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl p-5 sm:p-8">
            <div className="flex flex-col lg:flex-row items-stretch gap-4">
              <div className="flex-1 space-y-3">
                <p className="font-bold text-center">Start with anything you have</p>
                {[
                  { icon: Camera, label: 'Photos of pages' },
                  { icon: FileText, label: 'PDF file' },
                  { icon: TextCursorInput, label: 'Pasted text' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 rounded-2xl bg-base-200 px-4 py-3 font-semibold">
                    <r.icon className="w-6 h-6" aria-hidden /> {r.label}
                  </div>
                ))}
              </div>
              <div className="flex lg:flex-col items-center justify-center gap-2 opacity-60" aria-hidden>
                <ArrowRight className="w-8 h-8 rotate-90 lg:rotate-0" />
              </div>
              <div className="flex-1 space-y-3">
                <p className="font-bold text-center">Your helper prepares</p>
                {[
                  { icon: ListChecks, label: 'Table of contents', sub: 'See what is inside' },
                  { icon: BookOpen, label: 'Quick summary', sub: 'Your manual in a nutshell' },
                  { icon: CheckCircle2, label: 'To-do list', sub: 'What to do after purchase' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 rounded-2xl bg-base-200 px-4 py-3">
                    <r.icon className="w-6 h-6 shrink-0" aria-hidden />
                    <span><span className="font-semibold block leading-tight">{r.label}</span><span className="opacity-60 text-sm">{r.sub}</span></span>
                  </div>
                ))}
              </div>
              <div className="flex lg:flex-col items-center justify-center gap-2 opacity-60" aria-hidden>
                <ArrowRight className="w-8 h-8 rotate-90 lg:rotate-0" />
              </div>
              <div className="flex-1 rounded-2xl bg-base-200 p-4 space-y-3">
                <p className="font-bold text-center">Then just ask</p>
                <div className="chat chat-end"><div className='max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm bg-warning text-warning-content rounded-br-sm'>Is it safe to run it overnight?</div></div>
                <div className="chat chat-start"><div className='max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm bg-white border border-gray-100 rounded-bl-sm'>Yes — with these 2 checks first. Want me to walk you through them?</div></div>
                <a href="/register" className="btn btn-primary w-full rounded-2xl text-lg text-amber-900 font-bold">Try it with my manual</a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* COMFORT / ELDERLY */}
      <LandingBackground>
      <section id="comfort" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 scroll-mt-24">
        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            <Reveal className="p-6 sm:p-10">
              <p className="text-base font-bold uppercase tracking-widest text-warning">Built for comfort</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">Big text. Calm words. Patient helper.</h2>
              <ul className="mt-5 space-y-3 text-lg">
                {[
                  { icon: Glasses, text: 'Large print and high contrast, gentle on tired eyes.' },
                  { icon: ShieldCheck, text: 'Plain language — no strange technical words.' },
                  { icon: MessageCircleHeart, text: 'Ask as many times as you like. Your guide never rushes you.' },
                ].map(r => (
                  <li key={r.text} className="flex gap-3 items-start">
                    <r.icon className="w-7 h-7 mt-1 text-success shrink-0" aria-hidden />
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
              <a href="/register" className="btn btn-warning btn-lg rounded-2xl mt-6 text-xl font-bold">Start free — takes a minute</a>
            </Reveal>
            <div className="bg-base-200 p-6 sm:p-10 flex flex-col justify-center gap-4">
              <figure className="rounded-2xl bg-base-100 border border-base-300 p-5 shadow flex flex-col">
                <blockquote className="text-xl leading-relaxed font-medium text-center">My intention is to make product maintenance easy and accessible for everyone, without unnecessary jargon and technical talk.</blockquote>
                <figcaption className="mt-3 opacity-70">MidgardCoding, Manualist Developer</figcaption>
              </figure>
              <div className="flex items-center gap-3 text-lg opacity-75">
                <ShieldCheck className="w-6 h-6 text-success" aria-hidden />
                Your manuals stay private in your own archive.
              </div>
            </div>
          </div>
        </div>
      </section>
      </LandingBackground>

      {/* PRICING teaser */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 py-10 scroll-mt-24">
        <Reveal className="card bg-primary text-primary-content rounded-3xl shadow-xl p-6 sm:p-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-amber-900">Start free. Pay only when it helps.</h2>
          <p className="text-lg mt-3 opacity-90 max-w-2xl mx-auto text-amber-900">Every new account gains <b>10 free credits</b>. Saving a manual costs 1 credit. Chatting with your assistant costs 1 credit per message.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <div className='rounded-2xl aura aura-gold shadow-2xl'><a href="/register" className="btn btn-block rounded-2xl bg-base-100 text-base-content border-0 text-xl font-bold h-12">Claim 10 free credits</a></div>
            <a href="/login" className="btn btn-lg btn-ghost rounded-2xl text-xl border-2 border-primary-content/30 h-12">I already have an account</a>
          </div>
        </Reveal>
      </section>

      <Footer/>
    </div>
  );
}
