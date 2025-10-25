# 🛟 ResQ — Mutual Aid Circles on Base

**ResQ** es una plataforma de **microseguros colaborativos descentralizados** que combina **Base**, **Account Abstraction** y **IPFS** para ofrecer una forma accesible, transparente y sin intermediarios de enfrentar emergencias económicas y médicas.

Permite crear **fondos colectivos** entre amigos, familiares o comunidades, donde cada miembro aporta un monto, y en caso de un imprevisto (una emergencia médica, un accidente de viaje, una operación veterinaria, etc.), los demás pueden **votar on-chain** para liberar parte de esos fondos.

---

## 💡 Idea central

En América Latina, **menos del 15 %** de la población cuenta con una póliza de vida o salud tradicional, lo que refleja una brecha profunda en la cobertura de seguros.  
Además, **solo alrededor del 20 %** de las personas declara que podría reunir dinero rápidamente para una emergencia sin afectar su economía, dejando a un **80 %** en situación de vulnerabilidad financiera.

Las aseguradoras tradicionales son **costosas, lentas y excluyentes**, ofreciendo productos inalcanzables para la mayoría.  
**ResQ** propone una alternativa competitiva, comunitaria y verificable: un sistema de microseguros donde la **confianza se reemplaza por código abierto y votos verificables.**

> **Personas que confían entre sí pueden formar círculos de ayuda, aportar tokens, solicitar desembolsos con evidencia y votar para liberar fondos cuando ocurre una emergencia.**

Cada acción queda **verificada en la blockchain**, sin necesidad de intermediarios ni de una autoridad central.

---

## 🧩 Casos de uso

| Escenario                                | Descripción                                                                                    | Ejemplo                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 🏥 **Emergencias médicas**               | Un grupo de amigos skaters crea un fondo solidario para gastos imprevistos de salud.           | Juan sufre una fractura y abre un reclamo subiendo la boleta médica a IPFS. El grupo vota a favor y recibe el reembolso. |
| 🐾 **Seguros veterinarios comunitarios** | Vecinos contribuyen mensualmente para gastos veterinarios de sus mascotas.                     | “ResQ Pets” distribuye los pagos cuando un miembro tiene una cirugía imprevista de su perro.                             |
| ✈️ **Seguros de viaje entre amigos**     | Un grupo que viaja junto aporta a un fondo para cubrir emergencias.                            | En caso de pérdida de equipaje o gastos médicos, el grupo vota para liberar fondos.                                      |
| 🧱 **Círculos locales de confianza**     | Comunidades rurales o cooperativas gestionan un fondo para imprevistos o proyectos solidarios. | Un círculo financia reparaciones de infraestructura tras un evento climático.                                            |

---

## 🔁 Ejemplo de flujo completo

**Círculo “ResQ Salud 10”** — 10 personas, token ERC-20 (MockUSDC), Base Sepolia

| Parámetro                    | Valor                            |
| ---------------------------- | -------------------------------- |
| Token                        | MockUSDC (6 decimales)           |
| Monto mínimo de contribución | 10 USDC                          |
| Quórum                       | 40 % de los miembros (≥ 4 votos) |
| Aprobación                   | 60 % de los votos a favor        |
| Duración de votación         | 3 días                           |
| Límite de pago por reclamo   | 25 % del balance del círculo     |

### 👣 Paso a paso

1. **Creación del círculo:**  
   Ana despliega “ResQ Salud 10” desde el dashboard, definiendo los parámetros anteriores.  
   Se crea un contrato `ResQCircle` en Base Sepolia.

2. **Contribución inicial:**  
   Cada uno de los 10 miembros aporta **10 USDC** con el flujo “Approve + Join”.  
   El balance total del círculo queda en **100 USDC**.

3. **Apertura de reclamo:**  
   Luis sufre una urgencia dental de 20 USDC.  
   Abre un reclamo desde la app, sube la **boleta médica a IPFS** (`ipfs://bafy...`) y solicita el monto.

4. **Votación:**  
   Los miembros revisan la evidencia:

   - 6 votos ✅ Sí
   - 2 votos ❌ No
   - 2 sin votar  
     → **Quórum 80 %**, **Aprobación 75 % Sí**

5. **Finalización:**  
   Al expirar la votación, cualquiera ejecuta `finalizeClaim()`.  
   El contrato transfiere **20 USDC** a Luis.  
   El balance del círculo baja a **80 USDC**, y el reclamo se marca como **Pagado ✅**.

6. **Transparencia y evidencia:**  
   Toda la actividad queda disponible on-chain y el archivo en IPFS.  
   No existe autoridad central; todo el proceso es autónomo y verificable.

---

## 🚀 Características clave

- 🔐 **Account Abstraction (AA):** operar sin gas y sin MetaMask.
- 🧾 **Evidencia descentralizada:** archivos subidos a IPFS.
- ⚖️ **Gobernanza simple:** quórum + mayoría → pago automático.
- 🪙 **Mock ERC-20 token:** faucet integrado para pruebas.
- 🧩 **Modularidad:** cada círculo define sus propias reglas.

---

## 🏗️ Arquitectura técnica

| Capa                | Tecnología                | Descripción                                          |
| ------------------- | ------------------------- | ---------------------------------------------------- |
| **Frontend**        | React + Vite + TypeScript | UI con login, dashboard y discover                   |
| **AA / Wallets**    | thirdweb SDK              | Smart Accounts, MetaMask, Coinbase, email o teléfono |
| **Blockchain**      | Solidity + Hardhat        | Contratos `ResQFactory`, `ResQCircle`, `MockERC20`   |
| **Storage**         | IPFS (thirdweb storage)   | Evidencia descentralizada                            |
| **Off-chain reads** | viem                      | Logs, balances, claims, eventos                      |
| **Tests**           | Hardhat + Chai            | Flujo completo multiusuario                          |

---

## 📜 Smart Contracts

| Contrato      | Rol                                     | Archivo                                  |
| ------------- | --------------------------------------- | ---------------------------------------- |
| `ResQFactory` | Crea círculos nuevos                    | `packages/contracts/src/ResQFactory.sol` |
| `ResQCircle`  | Lógica de membresía, votaciones y pagos | `packages/contracts/src/ResQCircle.sol`  |
| `MockERC20`   | Token de prueba (mint público)          | `packages/contracts/src/MockERC20.sol`   |

---

## 💻 Frontend

Ubicación: `apps/web`

Variables de entorno

VITE_THIRDWEB_CLIENT_ID=tu_client_id_thirdweb
VITE_FACTORY_ADDR=0x...
VITE_BASE_SEPOLIA_RPC=https://sepolia.base.org

Comandos:
npm install
npm run dev

🧭 Visión y sostenibilidad

ResQ busca evolucionar hacia un ecosistema de confianza y reputación donde:

Cada círculo construya historial de votaciones y reclamos exitosos, generando una puntuación reputacional.

Los fondos puedan ser reasegurados entre círculos, creando redes de respaldo.

Se integren tokens estables locales (USDC, cUSD, USDT) y onramps accesibles.

Las métricas de impacto social (emergencias atendidas, fondos distribuidos) se registren públicamente.

A largo plazo, se habilite la creación de círculos entre completos desconocidos, gracias a la naturaleza trustless de blockchain y a mecanismos de reputación verificable que reduzcan el riesgo moral.

Escalar nuestros servicios para asegurar, startups, empresas y ofrecerlo a entidades financieras tradicionales.

De esta manera, ResQ aspira a convertirse en una infraestructura cooperativa Web3, uniendo innovación tecnológica, economía solidaria y transparencia on-chain.

🔮 Planes futuros

⚖️ Staking como "Membresia", incentivos para verificadores y penalizacion (slashing) para malos actores.

💻 Frontend avanzado: balances en tiempo real, perfiles y métricas por círculo.

🧠 Reputación on-chain: scoring para miembros confiables.

📜 Metodos avanzados de verificacion integrando "social attestation" o "nodos humanos".

💬 Chat seguro entre miembros: usando XMTP o Lens.

🌐 Integración con Filecoin y Celestia: para almacenamiento y disponibilidad de datos.

🪪 Identidad verificable: conexión con BAB, ENS, World ID o similares.

🤝 Círculos entre desconocidos: evolución natural hacia redes trustless de microseguros abiertos.

🕊️ ResQDAO: gobernanza de parámetros globales y tesorería comunitaria.

👥 Equipo y comunidad

Desarrollador: Favio Montealegre
Diseño: Ingrid Orellana

Comunidad: CochaBlock (Bolivia)

Stack: Base · thirdweb · Hardhat · IPFS · TypeScript

Proyecto desarrollado para "Base Batches 002" 2025, impulsando soluciones Web3 desde Latinoamérica 🌎
