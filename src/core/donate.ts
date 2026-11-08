/**
 * Optional donations. FrameShot is free forever: donating unlocks nothing and
 * is never required. The addresses are the developer's (the same as in
 * Unique Labs' GrowX and UnfollowX), and the QR codes in public/donate/ are
 * generated from them by scripts/build-donate-qr.py, which also proves each
 * code decodes back to the exact address.
 */

export interface Wallet {
  id: 'evm' | 'sol' | 'btc';
  title: string;
  subtitle: string;
  address: string;
  qr: string;
  tokens: { src: string; alt: string }[];
  networks: string[];
  note: string;
}

export const WALLETS: readonly Wallet[] = [
  {
    id: 'evm',
    title: 'EVM networks',
    subtitle: 'ETH, USDT, BNB, AVAX and more',
    address: '0x257F291514AaAa1533832cC2C8981Cc14063ED17',
    qr: '/donate/qr-evm.svg',
    tokens: [
      { src: '/donate/tok-eth.svg', alt: 'ETH' },
      { src: '/donate/tok-usdt.svg', alt: 'USDT' },
      { src: '/donate/tok-bnb.svg', alt: 'BNB' },
      { src: '/donate/tok-avax.svg', alt: 'AVAX' },
    ],
    networks: ['Ethereum', 'BNB Smart Chain', 'Avalanche C-Chain', '+ other EVM chains'],
    note: 'One address for every EVM network. Send ETH, USDT, BNB, AVAX or other EVM tokens.',
  },
  {
    id: 'sol',
    title: 'Solana',
    subtitle: 'SOL and Solana tokens',
    address: 'GwwZWYxzms9ebEWQNCAJrPSQdsN6SVPGbpMwCYomWqWa',
    qr: '/donate/qr-sol.svg',
    tokens: [{ src: '/donate/tok-sol.svg', alt: 'SOL' }],
    networks: ['Solana network'],
    note: 'Solana network only. Fast and almost free to send, perfect for small tips.',
  },
  {
    id: 'btc',
    title: 'Bitcoin',
    subtitle: 'BTC',
    address: 'bc1qg6clyevlmfekg3rkyhlk5ggeh3g6dnt5sdje4j',
    qr: '/donate/qr-btc.svg',
    tokens: [{ src: '/donate/tok-btc.svg', alt: 'BTC' }],
    networks: ['Bitcoin network', 'Native SegWit (bc1)'],
    note: 'Bitcoin network only.',
  },
];

/** The developer's Telegram (support, bug reports, ideas, thank-yous). */
export const TELEGRAM_URL = 'https://t.me/igfrostt';
