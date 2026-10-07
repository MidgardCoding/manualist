export const DISCORD_URL = "https://discord.gg/cnXFReJNRZ";

export default function TopBanner() {
  const message = (
    <>
      <span>Building Manualist with you! When Manualist fails or you experience errors, let me know on</span>
      <a
        href={DISCORD_URL || "#"}
        target={DISCORD_URL ? "_blank" : undefined}
        rel={DISCORD_URL ? "noopener noreferrer" : undefined}
        className="underline font-bold hover:opacity-80 px-1"
        onClick={(e) => {
          if (!DISCORD_URL) e.preventDefault();
        }}
      >
        Discord
      </a>
    </>
  );
  const items = [0, 1, 2, 3];

  return (
    <div className="w-full overflow-hidden bg-primary text-amber-950 text-sm font-medium py-1 select-none mb-3">
      <div className="flex w-max animate-topbanner-marquee gap-0 hover:[animation-play-state:paused]">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
            {items.map((i) => (
              <span key={i} className="mx-8 inline-flex items-center gap-1 whitespace-nowrap">
                {half === 0 && i === 0 ? <span className="sr-only">Status: </span> : null}
                {message}
                <span className="ml-8 opacity-50">• <span className="badge badge-error badge-sm mx-12 font-bold">Beta</span> • </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
