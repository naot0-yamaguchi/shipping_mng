import ImageUploader from "@/app/components/ImageUploader";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">TMS App - R2 画像アップロードテスト</h1>
      <ImageUploader />
    </main>
  );
}
