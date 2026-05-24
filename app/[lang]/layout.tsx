import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { hasLocale, type Locale, uiDictionary } from "@/lib/i18n";

export async function generateStaticParams() {
  return [{ lang: "es" }, { lang: "en" }, { lang: "fr" }];
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) {
    return {};
  }

  const dict = uiDictionary[lang];
  return {
    title: dict.metadataTitle,
    description: dict.metadataDescription,
  };
}

export default async function LangLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return <div data-locale={lang as Locale}>{children}</div>;
}
