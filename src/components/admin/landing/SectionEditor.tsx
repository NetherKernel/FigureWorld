"use client";

import React, { useEffect, useState } from "react";
import {
  ANNOUNCEMENT_TONES,
  AUDIENCES,
  BANNER_LAYOUTS,
  CARD_META,
  HERO_TINTS,
  PRODUCT_SOURCES,
  SECTION_META,
  createCard,
  createSlide,
  newId,
  type Audience,
  type CardConfig,
  type CardKind,
  type LandingSection,
  type SectionOf,
} from "@/lib/landing/config";
import {
  IconField,
  ImageField,
  LinkField,
  ListEditor,
  NumberField,
  SelectField,
  TextArea,
  TextField,
  Toggle,
} from "./fields";

/** Validation messages for this section, keyed by path inside the section (e.g. "slides.0.title") */
export type SectionErrors = Record<string, string>;

interface Props<S extends LandingSection = LandingSection> {
  section: S;
  onChange: (next: S) => void;
  errors: SectionErrors;
}

export function SectionEditor({ section, onChange, errors }: Props) {
  const patch = (p: Partial<LandingSection>) => onChange({ ...section, ...p } as LandingSection);

  return (
    <div className="space-y-5">
      {/* Placement & visibility — common to every section */}
      <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
        <Toggle
          checked={section.enabled}
          onChange={(enabled) => patch({ enabled })}
          label="Show on homepage"
          hint={section.enabled ? "Visible to the audience below" : "Hidden — kept in the layout so you can turn it back on"}
        />
        <SelectField<Audience> label="Who sees it" value={section.audience} onChange={(audience) => patch({ audience })} options={AUDIENCES} />
        <TextField
          label="Name in this list (optional)"
          hint="Only admins see this — helps tell similar sections apart"
          value={section.label}
          maxLength={60}
          placeholder={SECTION_META[section.type].name}
          onChange={(label) => patch({ label: label || undefined })}
        />
      </div>

      <TypeEditor section={section} onChange={onChange} errors={errors} />
    </div>
  );
}

function TypeEditor({ section, onChange, errors }: Props) {
  switch (section.type) {
    case "hero":
      return <HeroEditor section={section} onChange={onChange} errors={errors} />;
    case "topCategories":
      return <TopCategoriesEditor section={section} onChange={onChange} errors={errors} />;
    case "announcement":
      return <AnnouncementEditor section={section} onChange={onChange} errors={errors} />;
    case "cardRow":
      return <CardRowEditor section={section} onChange={onChange} errors={errors} />;
    case "dealsShelf":
      return <DealsShelfEditor section={section} onChange={onChange} errors={errors} />;
    case "productShelf":
      return <ProductShelfEditor section={section} onChange={onChange} errors={errors} />;
    case "spotlight":
      return <SpotlightEditor section={section} onChange={onChange} errors={errors} />;
    case "promoBanner":
      return <PromoBannerEditor section={section} onChange={onChange} errors={errors} />;
    case "guarantees":
      return <GuaranteesEditor section={section} onChange={onChange} errors={errors} />;
    case "storeInfo":
      return <StoreInfoEditor section={section} onChange={onChange} errors={errors} />;
    case "signInNudge":
      return <SignInNudgeEditor section={section} onChange={onChange} errors={errors} />;
  }
}

const hasErrorUnder = (errors: SectionErrors, prefix: string) => Object.keys(errors).some((k) => k === prefix || k.startsWith(`${prefix}.`));

/* ------------------------------------------------------------------ */

function HeroEditor({ section: s, onChange, errors }: Props<SectionOf<"hero">>) {
  return (
    <ListEditor
      title="Slides"
      items={s.slides}
      onChange={(slides) => onChange({ ...s, slides })}
      createItem={createSlide}
      addLabel="Add slide"
      min={1}
      max={8}
      itemTitle={(sl) => sl.title}
      errorFor={(i) => hasErrorUnder(errors, `slides.${i}`)}
      renderItem={(sl, update, i) => (
        <>
          <ImageField label="Background image" value={sl.image} onChange={(image) => update({ image })} error={errors[`slides.${i}.image`]} />
          <TextField label="Tag" value={sl.tag} maxLength={40} onChange={(tag) => update({ tag })} error={errors[`slides.${i}.tag`]} />
          <TextField label="Headline" value={sl.title} maxLength={90} onChange={(title) => update({ title })} error={errors[`slides.${i}.title`]} />
          <TextArea label="Subtitle" rows={2} value={sl.subtitle} maxLength={200} onChange={(subtitle) => update({ subtitle })} error={errors[`slides.${i}.subtitle`]} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Button text" value={sl.cta} maxLength={30} onChange={(cta) => update({ cta })} error={errors[`slides.${i}.cta`]} />
            <SelectField label="Text backdrop" value={sl.tint} onChange={(tint) => update({ tint })} options={Object.fromEntries(Object.entries(HERO_TINTS).map(([k, v]) => [k, v.label])) as Record<keyof typeof HERO_TINTS, string>} />
          </div>
          <LinkField label="Button link" value={sl.href} onChange={(href) => update({ href })} error={errors[`slides.${i}.href`]} />
        </>
      )}
    />
  );
}

function TopCategoriesEditor({ section: s, onChange, errors }: Props<SectionOf<"topCategories">>) {
  return (
    <div className="space-y-4">
      <TextField label="Title" value={s.title} maxLength={60} onChange={(title) => onChange({ ...s, title })} error={errors.title} />
      <TextField label="“View all” button text" value={s.seeAllLabel} maxLength={40} onChange={(seeAllLabel) => onChange({ ...s, seeAllLabel })} />
      <LinkField label="“View all” link" value={s.seeAllHref} onChange={(seeAllHref) => onChange({ ...s, seeAllHref })} error={errors.seeAllHref} />
      <ListEditor
        title="Category cards"
        items={s.items}
        onChange={(items) => onChange({ ...s, items })}
        createItem={() => ({ id: newId("cat"), name: "New Category", image: "/images/categories/bobblehead.jpg", href: "/products" })}
        addLabel="Add category"
        min={1}
        max={20}
        itemTitle={(it) => it.name}
        errorFor={(i) => hasErrorUnder(errors, `items.${i}`)}
        renderItem={(it, update, i) => (
          <>
            <TextField label="Category name" value={it.name} maxLength={60} onChange={(name) => update({ name })} error={errors[`items.${i}.name`]} />
            <ImageField label="Card image" value={it.image} onChange={(image) => update({ image })} error={errors[`items.${i}.image`]} />
            <LinkField label="Destination link" value={it.href} onChange={(href) => update({ href })} error={errors[`items.${i}.href`]} />
          </>
        )}
      />
    </div>
  );
}

function AnnouncementEditor({ section: s, onChange, errors }: Props<SectionOf<"announcement">>) {
  return (
    <div className="space-y-3">
      <TextField label="Message" value={s.text} maxLength={160} onChange={(text) => onChange({ ...s, text })} error={errors.text} />
      <SelectField label="Colour" value={s.tone} onChange={(tone) => onChange({ ...s, tone })} options={ANNOUNCEMENT_TONES} />
      <TextField label="Link text (optional)" value={s.linkLabel} maxLength={40} onChange={(linkLabel) => onChange({ ...s, linkLabel })} />
      <LinkField label="Link (optional)" value={s.href} onChange={(href) => onChange({ ...s, href })} error={errors.href} />
    </div>
  );
}

function CardRowEditor({ section: s, onChange, errors }: Props<SectionOf<"cardRow">>) {
  const [addKind, setAddKind] = useState<CardKind>("tiles");
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">Cards sit side by side on desktop (up to 4), two per row on tablets and stacked on phones.</p>
      <ListEditor
        title="Cards"
        items={s.cards}
        onChange={(cards) => onChange({ ...s, cards })}
        min={1}
        max={4}
        itemTitle={(c) => `${c.kind === "account" ? "Account / sign-in" : c.title} · ${CARD_META[c.kind]}`}
        errorFor={(i) => hasErrorUnder(errors, `cards.${i}`)}
        renderItem={(card, update, i) => <CardFields card={card} update={update} errors={errors} prefix={`cards.${i}`} />}
      />
      {s.cards.length < 4 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <SelectField label="Add a card" value={addKind} onChange={setAddKind} options={CARD_META} />
          </div>
          <button type="button" onClick={() => onChange({ ...s, cards: [...s.cards, createCard(addKind)] })} className="btn btn-secondary btn-sm h-[38px]">
            Add card
          </button>
        </div>
      )}
    </div>
  );
}

function CardFields({
  card,
  update,
  errors,
  prefix,
}: {
  card: CardConfig;
  update: (p: Partial<CardConfig>) => void;
  errors: SectionErrors;
  prefix: string;
}) {
  const e = (k: string) => errors[`${prefix}.${k}`];
  const linkFields = "href" in card && (
    <>
      <TextField label="Link text" value={card.linkLabel} maxLength={40} onChange={(linkLabel) => update({ linkLabel })} error={e("linkLabel")} />
      <LinkField label="Link" value={card.href} onChange={(href) => update({ href })} error={e("href")} />
    </>
  );

  switch (card.kind) {
    case "tiles":
      return (
        <>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <TextField label="Title" value={card.title} maxLength={60} onChange={(title) => update({ title })} error={e("title")} />
            <TextField label="Badge" value={card.badge} maxLength={12} placeholder="18+" onChange={(badge) => update({ badge: badge || undefined })} />
          </div>
          {linkFields}
          <ListEditor
            title="Tiles"
            items={card.tiles}
            onChange={(tiles) => update({ tiles } as Partial<CardConfig>)}
            createItem={() => ({ id: newId("t"), label: "New tile", image: card.tiles[0]?.image || "", href: "/products" })}
            addLabel="Add tile"
            min={1}
            max={4}
            itemTitle={(t) => t.label}
            errorFor={(i) => hasErrorUnder(errors, `${prefix}.tiles.${i}`)}
            renderItem={(t, upd, i) => (
              <>
                <TextField label="Label" value={t.label} maxLength={40} onChange={(label) => upd({ label })} error={e(`tiles.${i}.label`)} />
                <ImageField label="Image" value={t.image} onChange={(image) => upd({ image })} error={e(`tiles.${i}.image`)} />
                <LinkField label="Link" value={t.href} onChange={(href) => upd({ href })} error={e(`tiles.${i}.href`)} />
              </>
            )}
          />
        </>
      );
    case "image":
      return (
        <>
          <TextField label="Title" value={card.title} maxLength={60} onChange={(title) => update({ title })} error={e("title")} />
          <ImageField label="Image" value={card.image} onChange={(image) => update({ image })} error={e("image")} />
          {linkFields}
        </>
      );
    case "dealOfDay":
      return (
        <>
          <p className="text-[11px] text-muted">Automatically shows the product with the biggest discount right now.</p>
          <TextField label="Title" value={card.title} maxLength={60} onChange={(title) => update({ title })} error={e("title")} />
          {linkFields}
        </>
      );
    case "budgetPicks":
      return (
        <>
          <p className="text-[11px] text-muted">Shows the 4 cheapest figures at or under the price limit.</p>
          <TextField label="Title" value={card.title} maxLength={60} onChange={(title) => update({ title })} error={e("title")} />
          <NumberField label="Price limit (₹)" value={card.maxPrice} min={1} onChange={(maxPrice) => update({ maxPrice })} error={e("maxPrice")} />
          {linkFields}
        </>
      );
    case "account":
      return (
        <>
          <p className="text-[11px] text-muted">
            Signed-in customers see shortcuts to their orders, cart and addresses. Signed-out visitors see a sign-in box and this offer (leave the
            offer blank to hide it).
          </p>
          <TextField label="Offer label" value={card.offerLabel} maxLength={40} onChange={(offerLabel) => update({ offerLabel })} />
          <TextField label="Offer headline" value={card.offerTitle} maxLength={60} onChange={(offerTitle) => update({ offerTitle })} />
          <TextField label="Coupon code" value={card.offerCode} maxLength={24} onChange={(offerCode) => update({ offerCode: offerCode.toUpperCase() })} />
        </>
      );
  }
}

function DealsShelfEditor({ section: s, onChange, errors }: Props<SectionOf<"dealsShelf">>) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">Shows discounted products, biggest discount first (falls back to all figures when nothing is on sale).</p>
      <TextField label="Title" value={s.title} maxLength={60} onChange={(title) => onChange({ ...s, title })} error={errors.title} />
      <Toggle checked={s.showCountdown} onChange={(showCountdown) => onChange({ ...s, showCountdown })} label="Show “ends in” countdown" />
      <TextField label="“See all” text" value={s.seeAllLabel} maxLength={40} onChange={(seeAllLabel) => onChange({ ...s, seeAllLabel })} />
      <LinkField label="“See all” link" value={s.seeAllHref} onChange={(seeAllHref) => onChange({ ...s, seeAllHref })} error={errors.seeAllHref} />
    </div>
  );
}

function ProductShelfEditor({ section: s, onChange, errors }: Props<SectionOf<"productShelf">>) {
  const { categories } = useCatalogOptions();
  return (
    <div className="space-y-3">
      <TextField label="Title" value={s.title} maxLength={60} onChange={(title) => onChange({ ...s, title })} error={errors.title} />
      <SelectField label="Products to show" value={s.source} onChange={(source) => onChange({ ...s, source })} options={PRODUCT_SOURCES} />
      {s.source === "category" && (
        <SelectField
          label="Category"
          value={s.categorySlug || ""}
          onChange={(categorySlug) => onChange({ ...s, categorySlug: categorySlug || undefined })}
          options={[{ value: "", label: categories.length ? "Choose a category…" : "Loading categories…" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Max products" value={s.maxItems} min={2} max={30} onChange={(maxItems) => onChange({ ...s, maxItems })} error={errors.maxItems} />
        <TextField label="Badge (optional)" value={s.badge} maxLength={20} placeholder="18+ only" onChange={(badge) => onChange({ ...s, badge: badge || undefined })} />
      </div>
      <TextField label="“See all” text" value={s.seeAllLabel} maxLength={40} onChange={(seeAllLabel) => onChange({ ...s, seeAllLabel })} />
      <LinkField label="“See all” link" value={s.seeAllHref} onChange={(seeAllHref) => onChange({ ...s, seeAllHref })} error={errors.seeAllHref} />
      <div className="space-y-3 rounded-xl border border-dashed border-line p-3">
        <p className="text-[11px] text-muted">Optional note card at the start of the shelf (e.g. a safety notice).</p>
        <TextField label="Note title" value={s.introTitle} maxLength={60} onChange={(introTitle) => onChange({ ...s, introTitle: introTitle || undefined })} />
        <TextArea label="Note text" rows={3} value={s.introText} maxLength={300} onChange={(introText) => onChange({ ...s, introText: introText || undefined })} />
      </div>
    </div>
  );
}

function SpotlightEditor({ section: s, onChange }: Props<SectionOf<"spotlight">>) {
  const { products } = useCatalogOptions();
  return (
    <div className="space-y-3">
      <SelectField
        label="Product"
        value={s.productSlug || ""}
        onChange={(productSlug) => onChange({ ...s, productSlug })}
        options={[
          { value: "", label: "Automatic — biggest discount right now" },
          ...products.map((p) => ({ value: p.slug, label: p.name })),
        ]}
      />
      <TextField label="Badge" value={s.badge} maxLength={30} onChange={(badge) => onChange({ ...s, badge })} />
    </div>
  );
}

function PromoBannerEditor({ section: s, onChange, errors }: Props<SectionOf<"promoBanner">>) {
  return (
    <div className="space-y-3">
      <ImageField label="Image" value={s.image} onChange={(image) => onChange({ ...s, image })} error={errors.image} />
      <SelectField label="Layout" value={s.layout} onChange={(layout) => onChange({ ...s, layout })} options={BANNER_LAYOUTS} />
      <TextField label="Eyebrow" value={s.eyebrow} maxLength={40} onChange={(eyebrow) => onChange({ ...s, eyebrow })} />
      <TextField label="Headline" value={s.title} maxLength={90} onChange={(title) => onChange({ ...s, title })} error={errors.title} />
      <TextArea label="Text" rows={3} value={s.text} maxLength={300} onChange={(text) => onChange({ ...s, text })} />
      <TextField label="Button text" value={s.ctaLabel} maxLength={30} onChange={(ctaLabel) => onChange({ ...s, ctaLabel })} />
      <LinkField label="Button link" value={s.href} onChange={(href) => onChange({ ...s, href })} error={errors.href} />
    </div>
  );
}

function GuaranteesEditor({ section: s, onChange, errors }: Props<SectionOf<"guarantees">>) {
  return (
    <ListEditor
      title="Badges"
      items={s.items}
      onChange={(items) => onChange({ ...s, items })}
      createItem={() => ({ id: newId("g"), icon: "star" as const, title: "New badge", text: "" })}
      addLabel="Add badge"
      min={1}
      max={8}
      itemTitle={(it) => it.title}
      errorFor={(i) => hasErrorUnder(errors, `items.${i}`)}
      renderItem={(it, update, i) => (
        <>
          <IconField label="Icon" value={it.icon} onChange={(icon) => update({ icon })} />
          <TextField label="Title" value={it.title} maxLength={60} onChange={(title) => update({ title })} error={errors[`items.${i}.title`]} />
          <TextArea label="Text" rows={2} value={it.text} maxLength={200} onChange={(text) => update({ text })} />
        </>
      )}
    />
  );
}

function StoreInfoEditor({ section: s, onChange, errors }: Props<SectionOf<"storeInfo">>) {
  return (
    <div className="space-y-4">
      <TextField label="Heading" value={s.title} maxLength={60} onChange={(title) => onChange({ ...s, title })} />
      <TextArea label="About text" rows={4} value={s.text} maxLength={600} onChange={(text) => onChange({ ...s, text })} />
      <ListEditor
        title="Info columns"
        items={s.columns}
        onChange={(columns) => onChange({ ...s, columns })}
        createItem={() => ({ id: newId("c"), icon: "truck" as const, title: "New column", text: "" })}
        addLabel="Add column"
        max={3}
        itemTitle={(c) => c.title}
        errorFor={(i) => hasErrorUnder(errors, `columns.${i}`)}
        renderItem={(c, update, i) => (
          <>
            <IconField label="Icon" value={c.icon} onChange={(icon) => update({ icon })} />
            <TextField label="Title" value={c.title} maxLength={60} onChange={(title) => update({ title })} error={errors[`columns.${i}.title`]} />
            <TextArea label="Text" rows={3} value={c.text} maxLength={300} onChange={(text) => update({ text })} />
          </>
        )}
      />
    </div>
  );
}

function SignInNudgeEditor({ section: s, onChange, errors }: Props<SectionOf<"signInNudge">>) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted">Tip: keep “Who sees it” on signed-out visitors — signed-in customers don&apos;t need it.</p>
      <TextField label="Message" value={s.text} maxLength={120} onChange={(text) => onChange({ ...s, text })} />
      <TextField label="Button text" value={s.buttonLabel} maxLength={30} onChange={(buttonLabel) => onChange({ ...s, buttonLabel })} error={errors.buttonLabel} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface CatalogOptions {
  products: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
}

let catalogCache: Promise<CatalogOptions> | null = null;

function loadCatalogOptions(): Promise<CatalogOptions> {
  catalogCache ??= Promise.all([
    fetch("/api/products?limit=50").then((r) => r.json()).catch(() => null),
    fetch("/api/categories").then((r) => r.json()).catch(() => null),
  ]).then(([p, c]) => ({
    products: (p?.data?.products || []).map((x: { slug: string; name: string }) => ({ slug: x.slug, name: x.name })),
    categories: (c?.data?.categories || []).map((x: { slug: string; name: string }) => ({ slug: x.slug, name: x.name })),
  }));
  return catalogCache;
}

/** Product + category pickers' options (fetched once per editor session) */
function useCatalogOptions(): CatalogOptions {
  const [opts, setOpts] = useState<CatalogOptions>({ products: [], categories: [] });
  useEffect(() => {
    let alive = true;
    loadCatalogOptions().then((o) => alive && setOpts(o));
    return () => {
      alive = false;
    };
  }, []);
  return opts;
}
