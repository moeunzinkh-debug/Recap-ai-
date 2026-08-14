import type { Metadata } from "next";
import SettingsManager from "@/components/SettingsManager";

export const metadata: Metadata = {
  title: "API Keys",
  description: "គ្រប់គ្រង និងសាកល្បង Gemini API Key សម្រាប់បង្កើតស្គ្រីបសម្រាយរឿង។",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
          Configuration
        </p>
        <h1 className="mt-1.5 text-2xl font-extrabold text-white sm:text-3xl">
          គ្រប់គ្រង Gemini API Key
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          រក្សាទុក API Key ដោយអ៊ិនគ្រីបក្នុងមូលដ្ឋានទិន្នន័យ ឬប្រើ
          GEMINI_API_KEY ពី environment របស់ម៉ាស៊ីនបម្រើ។
        </p>
      </div>

      <SettingsManager />
    </main>
  );
}
