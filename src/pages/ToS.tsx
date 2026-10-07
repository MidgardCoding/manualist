import Background from '../components/Background'
import { LandingNav } from './LandingPage'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BookOpen,
  Copyright,
  FileCheck,
  FlaskConical,
  HeartHandshake,
  Info,
  KeyRound,
  Landmark,
  ListChecks,
  Mail,
  Power,
  RefreshCw,
  Scale,
  ShieldAlert,
  UploadCloud,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { DISCORD_URL } from '../components/TopBanner'

const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'acceptance', label: 'Acceptance of Terms' },
  { id: 'account-registration', label: 'Account Registration' },
  { id: 'user-content', label: 'User Content' },
  { id: 'license', label: 'License to Manualist' },
  { id: 'prohibited-conduct', label: 'Prohibited Conduct' },
  { id: 'intellectual-property', label: 'Intellectual Property' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'limitation', label: 'Limitation of Liability' },
  { id: 'indemnification', label: 'Indemnification' },
  { id: 'termination', label: 'Termination' },
  { id: 'changes', label: 'Changes to Terms' },
  { id: 'governing-law', label: 'Governing Law and Jurisdiction' },
  { id: 'contact', label: 'Contact Information' },
  { id: 'miscellaneous', label: 'Miscellaneous' },
]

function SectionCard({
  id,
  index,
  title,
  Icon,
  children,
}: {
  id: string
  index: number
  title: string
  Icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section id={id} className="card scroll-mt-28 overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-lg">
      <div className="flex items-center gap-3 border-b border-base-200 bg-base-200/60 px-5 py-4 sm:px-7">
        <span className="badge badge-primary badge-lg font-extrabold">{index}</span>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      <div className="prose max-w-none px-5 py-5 sm:px-7">{children}</div>
    </section>
  )
}

function ToS() {
  return (
    <Background>
      <LandingNav homeBase="/" />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-xl">
          <div className="bg-gradient-to-br from-primary/15 via-base-100 to-secondary/10 px-6 py-10 sm:px-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="badge badge-primary badge-outline">Legal Document</span>
              <span className="badge badge-ghost">Effective: October 1, 2026</span>
              <span className="badge badge-ghost">{TOC.length} sections</span>
            </div>
            <div className="flex items-start gap-4">
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-content shadow sm:inline-flex" aria-hidden>
                <Scale className="h-7 w-7" />
              </span>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  General Terms of Service for Manualist
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-base-content/70">
                  These Terms govern your access to and use of the Manualist website
                  and related services. Written in plain words — no surprises.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Beta status banner */}
        <div className="mt-6 overflow-hidden rounded-3xl border-2 border-warning/60 bg-gradient-to-br from-warning/25 via-base-100 to-primary/15 shadow-xl">
          <div className="flex flex-col items-start gap-4 px-6 py-6 sm:flex-row sm:items-center sm:px-8">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning text-warning-content shadow" aria-hidden>
              <FlaskConical className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                Manualist is currently in beta
                <span className="badge badge-warning font-bold">BETA</span>
              </p>
              <p className="mt-1 max-w-3xl text-base text-base-content/75">
                You are using an early test version — things may still break or
                behave unexpectedly. When Manualist fails or you run into errors,
                please let us know so we can fix it together.
              </p>
            </div>
            <a
              href={DISCORD_URL || '#'}
              target={DISCORD_URL ? '_blank' : undefined}
              rel={DISCORD_URL ? 'noopener noreferrer' : undefined}
              className="btn btn-primary shrink-0 rounded-2xl font-bold text-amber-900 shadow"
              onClick={(e) => {
                if (!DISCORD_URL) e.preventDefault();
              }}
              title={DISCORD_URL ? undefined : 'Invite link coming soon'}
            >
              Join us on Discord
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sticky sidebar TOC (desktop) */}
          <aside className="hidden lg:block">
            <nav aria-label="Terms contents" className="card sticky top-24 rounded-3xl border border-base-300 bg-base-100 p-4 shadow-lg">
              <p className="flex items-center gap-2 px-2 pb-2 text-sm font-bold uppercase tracking-widest text-base-content/60">
                <BookOpen className="h-4 w-4" aria-hidden /> Contents
              </p>
              <ol className="menu w-full gap-0.5 p-0">
                {TOC.map((item, i) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="rounded-2xl text-sm">
                      <span className="badge badge-sm badge-ghost font-bold">{i + 1}</span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Content column */}
          <div className="min-w-0 space-y-5">
            {/* Collapsible TOC (mobile / tablet) */}
            <details className="collapse-arrow collapse rounded-3xl border border-base-300 bg-base-100 shadow-lg lg:hidden">
              <summary className="collapse-title flex items-center gap-2 font-bold">
                <BookOpen className="h-5 w-5" aria-hidden /> Table of Contents
              </summary>
              <div className="collapse-content">
                <ol className="grid gap-1 sm:grid-cols-2">
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="link link-hover link-primary text-sm">
                        {i + 1}. {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </details>

            <SectionCard id="introduction" index={1} title="Introduction" Icon={Info}>
              <p>
                Welcome to Manualist, an AI-driven user manual assistant provided
                by MidgardCoding ("Manualist," "we," "us," or "our"). Manualist
                is a solo project located in Poland.
              </p>
              <p>
                These General Terms of Service ("Terms") govern your access to and
                use of the Manualist website, located at{' '}
                <a href="https://manualist.netlify.app" target="_blank" rel="noopener noreferrer">
                  https://manualist.netlify.app
                </a>,
                and all related services, features, content, and applications
                offered by Manualist (collectively, the "Service").
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by these
                Terms and our Privacy Policy, which is incorporated herein by
                reference. If you do not agree to these Terms, you may not access
                or use the Service.
              </p>
            </SectionCard>

            <SectionCard id="acceptance" index={2} title="Acceptance of Terms" Icon={FileCheck}>
              <p>
                By creating an account, uploading content, or otherwise using any
                part of the Service, you acknowledge that you have read,
                understood, and agree to be bound by these Terms. These Terms
                constitute a legally binding agreement between you and Manualist.
              </p>
            </SectionCard>

            <SectionCard id="account-registration" index={3} title="Account Registration" Icon={UserPlus}>
              <h3>Eligibility</h3>
              <p>
                You should be at least 18 years old to create an account and use
                the Service. By creating an account, you represent and warrant
                that you are at least 18 years old or have parental approval for
                using the service, while being at least 13 years old.
              </p>
              <h3>Account Creation</h3>
              <p>
                To access certain features of the Service, you must register for
                an account. You agree to provide accurate, current, and complete
                information during the registration process and to update such
                information to keep it accurate, current, and complete.
              </p>
              <h3>Confirmation Email</h3>
              <p>
                Upon successful registration, you will receive a confirmation
                email to verify your account.
              </p>
              <h3>Account Security</h3>
              <p>
                You are responsible for maintaining the confidentiality of your
                account login information and for all activities that occur under
                your account. You agree to notify Manualist immediately of any
                unauthorized use of your account. Manualist will not be liable for
                any loss or damage arising from your failure to comply with this
                security obligation.
              </p>
            </SectionCard>

            <SectionCard id="user-content" index={4} title="User Content" Icon={UploadCloud}>
              <h3>Content Upload</h3>
              <p>
                The Service allows you to upload images, PDF files, and text
                (collectively, "User Content") for AI analysis. You may also
                upload a photo for your profile avatar.
              </p>
              <h3>Rights to User Content</h3>
              <p>
                You retain all rights in and to your User Content. By uploading
                User Content, you represent and warrant that you have the
                necessary rights and permissions to upload and use such content
                for private use of user manuals and that your User Content does
                not infringe upon the rights of any third party.
              </p>
              <h3>AI Analysis</h3>
              <p>
                You understand and agree that your User Content will be processed
                and analyzed by artificial intelligence algorithms provided by
                Mistral AI to provide the core functionality of the Manualist
                service. This analysis is performed solely to assist you in
                managing and understanding your user manuals.
              </p>
              <h3>Storage</h3>
              <p>
                Your User Content is stored in a Supabase database.
              </p>
              <h3>Deletion</h3>
              <p>
                You can delete your User Content at any time by deleting your
                account. Upon account deletion, all associated User Content will
                be permanently removed from our databases.
              </p>
            </SectionCard>

            <SectionCard id="license" index={5} title="License to Manualist" Icon={KeyRound}>
              <p>
                By uploading User Content to the Service, you grant Manualist a
                limited, non-exclusive, worldwide, royalty-free license to use,
                process, adapt, transmit, display, and distribute your User
                Content solely for the purpose of operating, providing, and
                improving the Service. This license terminates when you delete
                your account.
              </p>
            </SectionCard>

            <SectionCard id="prohibited-conduct" index={6} title="Prohibited Conduct" Icon={Ban}>
              <p>You agree not to:</p>
              <ul>
                <li>Use the Service for any illegal or unauthorized purpose.</li>
                <li>
                  Upload any User Content that is unlawful, harmful, threatening,
                  abusive, harassing, defamatory, vulgar, obscene, libelous,
                  invasive of another's privacy, hateful, or racially,
                  ethnically, or otherwise objectionable.
                </li>
                <li>
                  Upload any User Content that infringes any patent, trademark,
                  trade secret, copyright, or other proprietary rights of any
                  party.
                </li>
                <li>
                  Interfere with or disrupt the integrity or performance of the
                  Service or data contained therein.
                </li>
                <li>
                  Attempt to gain unauthorized access to the Service or its
                  related systems or networks.
                </li>
                <li>
                  Impersonate any person or entity, or falsely state or otherwise
                  misrepresent your affiliation with a person or entity.
                </li>
                <li>
                  Engage in any activity that would constitute a criminal offense
                  or give rise to civil liability.
                </li>
              </ul>
            </SectionCard>

            <SectionCard id="intellectual-property" index={7} title="Intellectual Property" Icon={Copyright}>
              <h3>Manualist's Rights</h3>
              <p>
                All rights, title, and interest in and to the Service, including
                all intellectual property rights, are and will remain the
                exclusive property of Manualist. The Manualist name, logo, and any
                other Manualist product name, service name, or slogan displayed on
                the Service are trademarks of Manualist and may not be copied,
                imitated, or used, in whole or in part, without the prior written
                permission of Manualist.
              </p>
              <h3>User Content Rights</h3>
              <p>
                As stated in Section 4.2, you retain all rights in and to your
                User Content.
              </p>
            </SectionCard>

            <SectionCard id="disclaimers" index={8} title="Disclaimers" Icon={AlertTriangle}>
              <div className="alert alert-warning not-prose rounded-2xl">
                <span>
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                  WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING,
                  BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY,
                  FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                  MANUALIST DOES NOT WARRANT THAT THE SERVICE WILL BE
                  UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT DEFECTS WILL BE
                  CORRECTED.
                </span>
              </div>
            </SectionCard>

            <SectionCard id="limitation" index={9} title="Limitation of Liability" Icon={ShieldAlert}>
              <div className="alert alert-warning not-prose rounded-2xl">
                <span>
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
                  SHALL MANUALIST, ITS AFFILIATES, AGENTS, DIRECTORS, EMPLOYEES,
                  SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE,
                  INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES,
                  INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS,
                  GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF
                  OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
                </span>
              </div>
            </SectionCard>

            <SectionCard id="indemnification" index={10} title="Indemnification" Icon={HeartHandshake}>
              <p>
                You agree to defend, indemnify, and hold harmless Manualist and
                its affiliates, officers, directors, employees, and agents from
                and against any and all claims, damages, obligations, losses,
                liabilities, costs, or debt, and expenses, including but not
                limited to attorney's fees, arising from:
              </p>
              <ol type="a">
                <li>Your use of and access to the Service;</li>
                <li>Your violation of any term of these Terms;</li>
                <li>
                  Your violation of any third-party right, including without
                  limitation any copyright, property, or privacy right; or
                </li>
                <li>
                  Any claim that your User Content caused damage to a third party.
                </li>
              </ol>
            </SectionCard>

            <SectionCard id="termination" index={11} title="Termination" Icon={Power}>
              <h3>By You</h3>
              <p>
                You may terminate your account at any time by deleting your
                account through the Service settings. Upon termination, your
                access to the Service will be revoked, and all your User Content
                will be deleted as per Section 4.5.
              </p>
              <h3>By Manualist</h3>
              <p>
                Manualist may terminate or suspend your account and access to the
                Service immediately, without prior notice or liability, for any
                reason whatsoever, including without limitation if you breach
                these Terms.
              </p>
            </SectionCard>

            <SectionCard id="changes" index={12} title="Changes to Terms" Icon={RefreshCw}>
              <p>
                Manualist reserves the right to modify or replace these Terms at
                any time. If a revision is material, we will provide at least 30
                days notice prior to any new terms taking effect. What constitutes
                a material change will be determined at our sole discretion. By
                continuing to access or use our Service after those revisions
                become effective, you agree to be bound by the revised terms.
              </p>
            </SectionCard>

            <SectionCard id="governing-law" index={13} title="Governing Law and Jurisdiction" Icon={Landmark}>
              <p>
                These Terms shall be governed and construed in accordance with
                the laws of Poland, without regard to its conflict of law
                provisions. You agree to submit to the personal jurisdiction of
                the courts located in Poland for the purpose of litigating all
                such claims or disputes.
              </p>
            </SectionCard>

            <SectionCard id="contact" index={14} title="Contact Information" Icon={Mail}>
              <p>
                If you have any questions about these Terms, please contact us
                via our contact page:{' '}
                <a
                  href="https://manualist.netlify.app/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://manualist.netlify.app/contact
                </a>
              </p>
            </SectionCard>

            <SectionCard id="miscellaneous" index={15} title="Miscellaneous" Icon={ListChecks}>
              <h3>Entire Agreement</h3>
              <p>
                These Terms, together with the Privacy Policy, constitute the
                entire agreement between you and Manualist regarding the use of
                the Service.
              </p>
              <h3>Severability</h3>
              <p>
                If any provision of these Terms is held to be invalid or
                unenforceable, the remaining provisions of these Terms will
                remain in full force and effect.
              </p>
              <h3>Waiver</h3>
              <p>
                No waiver of any term of these Terms shall be deemed a further or
                continuing waiver of such term or any other term, and Manualist's
                failure to assert any right or provision under these Terms shall
                not constitute a waiver of such right or provision.
              </p>
              <h3>Effective Date</h3>
              <p>
                <time dateTime="2026-10-01">October 1, 2026</time>
              </p>
            </SectionCard>

            {/* Footer CTA */}
            <div className="card rounded-3xl border border-base-300 bg-base-100 shadow-xl">
              <div className="card-body flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold">Questions about these Terms?</h2>
                  <p className="mt-1 text-sm text-base-content/70">
                    Contact the Manualist team — or head back to the start page.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href="/" className="btn btn-ghost rounded-2xl border border-base-300">
                    <ArrowLeft className="h-5 w-5" aria-hidden /> Back to Manualist
                  </a>
                  <a
                    href="https://manualist.netlify.app/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary rounded-2xl text-amber-900 font-bold"
                  >
                    <Mail className="h-5 w-5" aria-hidden /> Contact Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Background>
  )
}

export default ToS
