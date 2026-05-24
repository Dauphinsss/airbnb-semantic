import { notFound } from "next/navigation";

import HomeClient from "./home-client";
import { hasLocale } from "@/lib/i18n";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return <HomeClient lang={lang} />;
}
