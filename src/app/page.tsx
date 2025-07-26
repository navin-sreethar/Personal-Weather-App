import { ImageAnalyzer } from '@/components/image-analyzer';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start p-4 sm:p-8 md:p-12">
      <ImageAnalyzer />
    </main>
  );
}
