# 🛟 ResQ — Mutual Aid Circles on Base

## English Version

ResQ is a platform for decentralized collaborative micro-insurance that combines Base, Account Abstraction, and IPFS to offer an accessible, transparent, and intermediary-free way to handle medical and financial emergencies.

It enables the creation of collective funds among friends, families, or communities, where each member contributes a certain amount. When an unforeseen event occurs (medical emergency, travel incident, veterinary bills, etc.), members can vote on-chain to release part of the pooled funds.

---

Core Idea

In Latin America, less than 15% of the population has traditional life insurance coverage, and only about 20% report they could quickly raise money for an emergency without harming their finances—leaving nearly 80% without a critical buffer.

Traditional insurers are expensive, bureaucratic, and exclusionary. ResQ offers a competitive, community-driven, verifiable alternative where trust is replaced by open-source code and transparent voting.

People who trust each other can form circles of mutual aid, contribute tokens, submit claims with evidence, and vote to release funds when an emergency happens.

Every action is verifiable on-chain, with no central authority.

---

Use Cases

Medical emergencies – A group of skateboarders creates a solidarity fund for injuries. Example: Juan breaks his leg and uploads the hospital bill to IPFS. The group votes and reimburses him.
Community pet coverage – Neighbors pool funds for vet emergencies. Example: “ResQ Pets” releases payment when a member’s dog needs surgery.
Travel coverage among friends – Travelers contribute to cover unforeseen issues. Example: If luggage is lost or medical costs arise, the group votes to release funds.
Local cooperative circles – Neighborhoods or co-ops manage community emergency funds. Example: A circle finances post-storm infrastructure repairs.

---

Example Flow

Circle: “ResQ Salud 10” — 10 members, ERC-20 token (MockUSDC), Base Sepolia

Token: MockUSDC (6 decimals)
Minimum contribution: 10 USDC
Quorum: 40% (≥ 4 votes)
Approval threshold: 60% Yes votes
Voting duration: 3 days
Payout cap: 25% of circle balance

Steps

1. Creation: Ana deploys “ResQ Salud 10” from the dashboard.
2. Contributions: Each member deposits 10 USDC via Approve + Join (total 100 USDC).
3. Claim: Luis has a dental emergency and requests 20 USDC, uploading the invoice to IPFS.
4. Voting: 6 Yes, 2 No, 2 abstain → Quorum 80%, Approval 75%.
5. Finalization: After voting ends, anyone calls finalizeClaim(); Luis receives 20 USDC.
6. Transparency: Evidence + votes remain verifiable on Base + IPFS.

---

Key Features

- Account Abstraction (AA): gasless smart-account UX.
- Decentralized evidence: files on IPFS.
- Simple governance: quorum + majority → automatic payout.
- Mock ERC-20 token: faucet for testing.
- Modularity: each circle sets its own parameters.

---

Technical Architecture

Frontend: React + Vite + TypeScript
AA / Wallets: thirdweb SDK
Blockchain: Solidity + Hardhat
Storage: IPFS (thirdweb storage)
Off-chain reads: viem
Tests: Hardhat + Chai

---

Smart Contracts

ResQFactory – Deploys new circles
ResQCircle – Membership + voting + payouts
MockERC20 – Public mint test token

---

Frontend

Location: apps/web

Environment variables:

VITE_THIRDWEB_CLIENT_ID
VITE_FACTORY_ADDR
VITE_BASE_SEPOLIA_RPC

Commands: npm install, npm run dev

---

Vision & Sustainability

ResQ aims to become an ecosystem of trust and reputation where:

- Circles build reputation scores from fulfilled claims.
- Funds are reinsured across circles.
- Stablecoins and on-ramps improve accessibility.
- Social impact metrics are public.
- Circles among strangers become possible through trustless blockchain logic.
- Users can become "human oracles" and earn rewards by attesting emergencies and claims

---

Risks & Mitigations

Fraudulent claims – IPFS evidence + majority voting.
Low participation – Re-vote or automatic return if quorum not met.
Funds not returned – Rules for repayment or exclusion.
Sybil attacks – On-chain identity verification.
Locked funds – emergencyWithdraw() recovery function.

---

Future Plans
Memberships, Staking/slashing, Advanced UI, On-chain reputation, Social attestation, Member chat, Filecoin + Celestia, Verifiable identity, Trustless circles, ResQ DAO.

---

Team & Community
Developer: Favio Montealegre
Design: Ingrid Orellana
Community: CochaBlock (Bolivia)
Stack: Base · thirdweb · Hardhat · IPFS · TypeScript
License: MIT 2025 – ResQ Project

---

🇪🇸 Versión en Español

ResQ es una plataforma de microseguros colaborativos descentralizados que combina Base, Account Abstraction e IPFS para ofrecer una forma accesible, transparente y sin intermediarios de enfrentar emergencias económicas y médicas.

Permite crear fondos colectivos entre amigos, familiares o comunidades, donde cada miembro aporta un monto. Ante un imprevisto (emergencia médica, incidente de viaje, gastos veterinarios, etc.), los miembros pueden votar on-chain para liberar parte de los fondos.

---

Idea Central
En América Latina, menos del 15% tiene un seguro de vida tradicional, y solo ~20% podría reunir dinero para una emergencia sin afectar su economía, dejando a casi 80% en riesgo financiero.

ResQ propone una alternativa comunitaria y verificable donde la confianza se reemplaza por código abierto y votos transparentes.

---

Casos de Uso
Emergencias médicas – Amigos skaters crean un fondo solidario para lesiones.
Cobertura veterinaria – Vecinos aportan para emergencias de mascotas.
Cobertura de viaje – Viajeros aportan para imprevistos.
Círculos cooperativos – Barrios o comunidades gestionan fondos solidarios.

---

Ejemplo de Flujo
Círculo: ResQ Salud 10 – 10 personas, token MockUSDC en Base Sepolia.

Token: MockUSDC (6 decimales)
Contribución mínima: 10 USDC
Quórum: 40% (≥ 4 votos)
Aprobación: 60% a favor
Duración: 3 días
Tope: 25% del balance

Pasos: creación, aportes, reclamo, votación, finalización, transparencia.

---

Características Clave

- Account Abstraction (AA): sin gas.
- Evidencia en IPFS.
- Gobernanza simple.
- Token Mock ERC-20.
- Modularidad por círculo.

---

Visión y Sostenibilidad
ResQ aspira a un ecosistema donde:

- Los círculos construyen reputación.
- Los fondos se reaseguran entre sí.
- Se integran stablecoins y onramps.
- Se habilitan círculos entre desconocidos (trustless).
- Usuarios se pueden convertir en "oraculos humanos" y sr recompensados por verificar hechos y reclamos.

---

Riesgos y Mitigaciones
Fraude: evidencia + voto mayoritario.
Falta de quórum: re-votación.
Fondos no devueltos: penalización.
Sybil: identidad on-chain.
Fondos bloqueados: emergencyWithdraw().

---

Planes Futuros
Membresias, Staking/slashing, UI avanzada, reputación, chat XMTP, verificación social, Filecoin + Celestia, DAO, identidad verificable, círculos trustless.

---

Equipo y Comunidad
Desarrollador: Favio Montealegre
Diseño: Ingrid Orellana
Comunidad: CochaBlock (Bolivia)
Stack: Base · thirdweb · Hardhat · IPFS · TypeScript
Licencia: MIT 2025 – ResQ Project
