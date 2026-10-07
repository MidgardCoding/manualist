function Footer() {
  return (
    <footer className="footer footer-horizontal footer-center bg-base-200 text-base-content rounded p-10">
      <nav className="grid grid-flow-col gap-4">
        <a className="link link-hover" href="#problems">Why Manualist</a>
        <a className="link link-hover" href="#how-it-works">How it works</a>
        <a className="link link-hover" href="#comfort">Easy to read</a>
        <a className="link link-hover" href="#pricing">Pricing</a>
        <a className="link link-hover opacity-50" href="https://discord.gg/cnXFReJNRZ">Discord</a>
        <a className="link link-hover opacity-50" href="https://discord.gg/cnXFReJNRZ">Roadmap</a>
        <a className="link link-hover opacity-50" href="https://github.com/MidgardCoding/manualist">GitHub</a>
      </nav>
      <aside>
        <p>Copyright © {new Date().getFullYear()} - All right reserved by Manualist Project | Midgard Coding</p>
      </aside>
    </footer>
  )
}

export default Footer