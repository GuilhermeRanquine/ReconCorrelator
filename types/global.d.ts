/// <reference types="C:/Users/ranquine/.recon_correlator_vendor/node_modules/@types/react" />
/// <reference types="C:/Users/ranquine/.recon_correlator_vendor/node_modules/@types/react-dom" />
/// <reference types="C:/Users/ranquine/.recon_correlator_vendor/node_modules/@types/node" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module 'lucide-react' {
  export * from '@/lib/icons';
}
