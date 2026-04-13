/**
 * Sample campaigns (Solana). Replace with API or DB later.
 * Addresses are base58 Solana public keys (SPL / SOL).
 */
window.CROWDCARE_CAMPAIGNS = [
  {
    id: "medical-bills",
    title: "Help with medical bills after surgery",
    body: [
      "I'm recovering and can't work full-time for a few months. I'm raising funds to cover insurance gaps and prescriptions.",
      "Any support helps—thank you for reading. Donations on Solana (SOL or USDC).",
    ],
    goalLabel: "5,000 USDC on Solana",
    goalAmount: 5000,
    raisedAmount: 1420,
    goalCurrency: "USDC",
    transparencyBeneficiaryPct: 97,
    transparencyOtherPct: 3,
    transparencyOtherLabel: "Est. network fees & conversion",
    transparencyNote:
      "Funds sent to the campaign wallet are visible on-chain. This demo does not move money automatically—always verify the address before sending.",
  },
  {
    id: "rent-after-layoff",
    title: "Help with rent after job loss",
    body: [
      "I was laid off without warning and am two months behind on rent while I search for work.",
      "I'm hoping to stay housed until my first paycheck at a new job. Solana network.",
    ],
    goalLabel: "2,500 USDC on Solana",
    goalAmount: 2500,
    raisedAmount: 875,
    goalCurrency: "USDC",
    transparencyBeneficiaryPct: 98,
    transparencyOtherPct: 2,
    transparencyOtherLabel: "Buffer for tx fees",
    transparencyNote:
      "Payouts are peer-to-peer to this Solana address. CrowdCare shows targets for transparency; on-chain totals can differ.",
  },
];
