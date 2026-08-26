declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module 'lucide-react' {
  export * from '@/lib/icons';
}
