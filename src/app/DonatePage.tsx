/**
 * Support FrameShot: optional crypto donations plus free ways to help.
 * Nothing here is required, nothing is unlocked by donating, and no request
 * leaves the browser: the QR codes are bundled images and addresses are only
 * copied to the clipboard when the user clicks.
 */
import { AlertTriangle, ArrowLeft, Bug, Check, Coffee, Copy, Gift, Heart, Lightbulb, Lock, RefreshCw, Share2, Sparkles, Star } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { TELEGRAM_URL, WALLETS, type Wallet } from '../core/donate';
import { hasStoreListing, listingUrl, markReviewDone, reviewUrl } from '../core/review';
import { navigate } from '../ui/hooks';
import { useToast } from '../ui/overlays';
import { Button, Credits, cx } from '../ui/primitives';
import { playSound } from '../ui/sounds';

const ORBIT = ['tok-btc', 'tok-eth', 'tok-sol', 'tok-usdt', 'tok-bnb', 'tok-avax'];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-center text-[13px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
      {children}
    </h2>
  );
}

function WalletCard({ wallet, i }: { wallet: Wallet; i: number }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    if (await copyText(wallet.address)) {
      setCopied(true);
      playSound('success');
      toast.success(`${wallet.title} address copied. Thank you!`);
    } else {
      toast.error('Could not copy. Select the address and copy it by hand.');
    }
  };
  return (
    <article className="fr-card fr-lift fr-spot fr-stagger flex flex-col p-5" style={{ '--i': i + 2 } as CSSProperties} data-testid={`wallet-${wallet.id}`}>
      <header className="flex items-center gap-3">
        <div className="flex shrink-0 -space-x-1.5">
          {wallet.tokens.map((t) => (
            <img key={t.alt} src={t.src} alt={t.alt} className="h-8 w-8 rounded-full ring-2 ring-[var(--fr-card)]" />
          ))}
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight">{wallet.title}</h3>
          <p className="text-[12px] text-fg-subtle">{wallet.subtitle}</p>
        </div>
      </header>
      <div className="mx-auto mt-4 rounded-[16px] bg-white p-2.5 shadow-card ring-1 ring-black/5">
        <img src={wallet.qr} alt={`QR code for the ${wallet.title} donation address`} className="block h-40 w-40" />
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {wallet.networks.map((n) => (
          <span key={n} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-muted">
            {n}
          </span>
        ))}
      </div>
      <code className="mt-3 block select-all break-all rounded-[11px] border border-border bg-surface-2 px-3 py-2 text-center font-mono text-[12px] leading-relaxed text-fg" data-testid={`wallet-${wallet.id}-address`}>
        {wallet.address}
      </code>
      <Button variant="primary" className="mt-3 w-full" icon={copied ? <Check size={15} /> : <Copy size={15} />} onClick={() => void copy()} data-testid={`wallet-${wallet.id}-copy`}>
        {copied ? 'Copied' : 'Copy address'}
      </Button>
      <p className="mt-2.5 text-center text-[12px] leading-snug text-fg-subtle">{wallet.note}</p>
    </article>
  );
}

function Why({ icon, title, children, i }: { icon: ReactNode; title: string; children: ReactNode; i: number }) {
  return (
    <div className="fr-card fr-lift fr-spot fr-stagger p-5" style={{ '--i': i } as CSSProperties}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary-soft text-primary">{icon}</span>
      <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-subtle">{children}</p>
    </div>
  );
}

function HelpCard({ icon, title, children, onClick, href, testId }: { icon: ReactNode; title: string; children: ReactNode; onClick?: () => void; href?: string; testId?: string }) {
  const cls = 'fr-card fr-lift fr-spot fr-press block p-5 text-left';
  const body = (
    <>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary-soft text-primary">{icon}</span>
      <span className="block text-[15px] font-semibold tracking-tight">{title}</span>
      <span className="mt-1.5 block text-[13px] leading-relaxed text-fg-subtle">{children}</span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls} data-testid={testId}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls} data-testid={testId}>
      {body}
    </button>
  );
}

export function DonatePage() {
  const toast = useToast();
  const [listed, setListed] = useState(false);
  useEffect(() => {
    void hasStoreListing().then(setListed);
  }, []);
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const share = async () => {
    const text = `FrameShot: a free screen recorder and full-page screenshot tool for Chrome. No ads, no watermark, no sign-up, and everything stays on your device.${listed ? ` ${listingUrl()}` : ''}`;
    if (await copyText(text)) {
      playSound('success');
      toast.success('A short note about FrameShot was copied. Paste it anywhere to share.');
    } else toast.error('Could not copy to the clipboard.');
  };

  return (
    <div id="fr-donate-scroll" className="fr-scroll h-full overflow-y-auto">
      <header className="fr-glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border px-5">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
          Library
        </Button>
        <span className="h-5 w-px bg-border" aria-hidden />
        <h1 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <Heart size={16} className="text-rose-500" fill="currentColor" aria-hidden /> Support FrameShot
        </h1>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-16 pt-10">
        {/* Hero */}
        <section className="fr-card relative grid items-center gap-8 overflow-hidden p-8 md:grid-cols-[260px_1fr]">
          <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" aria-hidden />
          <div className="fr-orbit relative mx-auto h-[220px] w-[220px]" aria-hidden>
            <div className="fr-orbit-ring">
              {ORBIT.map((t, i) => (
                <img key={t} src={`/donate/${t}.svg`} alt="" style={{ '--i': i, '--n': ORBIT.length } as CSSProperties} />
              ))}
            </div>
            <span className="fr-orbit-heart">
              <Heart size={34} fill="currentColor" />
            </span>
          </div>
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[12px] font-semibold text-primary-soft-fg">
              <Sparkles size={13} /> Free forever · powered by people like you
            </span>
            <h2 className="mt-4 text-[clamp(28px,4vw,40px)] font-semibold leading-[1.08] tracking-[-0.03em]">
              Keep FrameShot <span className="fr-accent-text">free for everyone</span>
            </h2>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg-muted">
              FrameShot has no ads, no subscriptions, no locked features and no tracking, and it never will. If it saves you time, a small tip helps keep it improving.
            </p>
            <div className="mt-4 flex max-w-xl items-start gap-2.5 rounded-[14px] border border-amber-400/30 bg-amber-400/10 px-3.5 py-3 text-[13px] leading-snug text-fg-muted">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <span>
                <b className="text-fg">Even $0.10 means a lot.</b> Every donation, however small, says this tool is worth the late nights, and keeps it free for the next person.
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button variant="primary" size="lg" icon={<Heart size={17} />} onClick={() => jump('wallets')} data-testid="donate-now">
                Donate now
              </Button>
              <Button size="lg" icon={<Star size={17} />} onClick={() => jump('help-free')}>
                Other ways to help
              </Button>
            </div>
          </div>
        </section>

        {/* Why */}
        <div className="mt-14">
          <SectionTitle>Why donate?</SectionTitle>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Why i={0} icon={<Gift size={19} />} title="Free, with nothing held back">
              Full-page capture, the editor, the screen recorder, GIF export: everything is free for everyone. Donations help keep it that way.
            </Why>
            <Why i={1} icon={<RefreshCw size={19} />} title="Chrome keeps changing">
              Every Chrome release can change how capturing and recording work. Your support pays for the hours of testing that keep FrameShot reliable.
            </Why>
            <Why i={2} icon={<Lock size={19} />} title="Private by design">
              No accounts, no analytics, no ads, no uploads. Your screenshots and recordings never leave your device.
            </Why>
            <Why i={3} icon={<Coffee size={19} />} title="An independent developer">
              Built by one developer at Unique Labs. Your tip goes straight to the person who fixes bugs and answers your messages.
            </Why>
          </div>
        </div>

        {/* How */}
        <div className="mt-14">
          <SectionTitle>How to donate</SectionTitle>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Pick a coin you already have', 'Any of the networks below works. Use whatever is in your wallet.'],
              ['Scan or copy', 'Scan the QR code with your wallet app, or press Copy to grab the address.'],
              ['Send any amount', '$0.10, $1, $5: truly any amount helps. Message the developer on Telegram if you’d like a thank-you!'],
            ].map(([t, d], i) => (
              <li key={t} className="fr-card fr-stagger flex gap-3.5 p-5" style={{ '--i': i } as CSSProperties}>
                <span className="fr-accent-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white shadow-glow">{i + 1}</span>
                <span>
                  <b className="block text-[14px] font-semibold tracking-tight">{t}</b>
                  <span className="mt-1 block text-[13px] leading-relaxed text-fg-subtle">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Wallets */}
        <div className="mt-14">
          <SectionTitle id="wallets">Donation addresses</SectionTitle>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {WALLETS.map((w, i) => (
              <WalletCard key={w.id} wallet={w} i={i} />
            ))}
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[13px] text-warning">
            <AlertTriangle size={15} className="shrink-0" /> Always double-check the network before you send. Crypto sent on the wrong network can’t be recovered.
          </p>
        </div>

        {/* Free ways to help */}
        <div className="mt-14">
          <SectionTitle id="help-free">Other ways to help, all free</SectionTitle>
          <div className={cx('mt-6 grid gap-4 sm:grid-cols-2', listed ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            {listed && (
              <HelpCard
                icon={<Star size={19} />}
                title="Rate FrameShot"
                onClick={() => {
                  void markReviewDone();
                  void chrome.tabs.create({ url: reviewUrl() });
                }}
                testId="donate-rate"
              >
                A review on the Chrome Web Store helps more people find a free, private screenshot tool.
              </HelpCard>
            )}
            <HelpCard icon={<Share2 size={19} />} title="Share with a friend" onClick={() => void share()} testId="donate-share">
              Copy a short note about FrameShot and send it to anyone who takes screenshots or records their screen.
            </HelpCard>
            <HelpCard icon={<Bug size={19} />} title="Report a bug" href={TELEGRAM_URL}>
              Spotted something off? Tell the developer on Telegram and it gets fixed fast.
            </HelpCard>
            <HelpCard icon={<Lightbulb size={19} />} title="Request a feature" href={TELEGRAM_URL}>
              Got an idea to make FrameShot better? Features users ask for get built first.
            </HelpCard>
          </div>
        </div>

        {/* Thanks */}
        <section className="fr-card mt-14 flex flex-col items-center gap-4 p-7 text-center sm:flex-row sm:text-left">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-500/12 text-rose-500">
            <span className="fr-rings rounded-full" style={{ ['--fr-primary' as string]: '#f43f5e' } as CSSProperties} aria-hidden>
              <span />
              <span />
            </span>
            <Heart size={24} fill="currentColor" />
          </span>
          <div>
            <p className="text-[16px] font-semibold tracking-tight">Thank you, truly.</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">
              Whether you donate, share or simply use FrameShot every day, you’re the reason it exists. —{' '}
              <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-fg underline-offset-2 hover:underline">
                Shahriar Ahmed
              </a>
              , Unique Labs
            </p>
          </div>
        </section>
        <Credits className="mt-8" />
      </div>
    </div>
  );
}
