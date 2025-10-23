/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THIRDWEB_CLIENT_ID: string;
  readonly VITE_FACTORY_ADDR: string; // no uses template literal aquí
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
