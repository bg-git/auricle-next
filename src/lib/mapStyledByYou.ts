// src/lib/mapStyledByYou.ts
import type { UGCItem } from "@/components/StyledByYou";

type ImageObj = {
  url: string;
  width: number;
  height: number;
  altText?: string | null;
};

type MediaImageRef = { __typename: "MediaImage"; image: ImageObj };
type ProductRef = { __typename: "Product"; id: string };
type Reference = MediaImageRef | ProductRef | { __typename?: string } | null | undefined;

export interface MetaobjectField {
  key: string;
  value?: string | null;
  reference?: Reference;
}

export interface MetaobjectNode {
  id: string;
  fields: MetaobjectField[];
}

export interface MetaobjectEdge {
  node: MetaobjectNode;
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const match = (k: string, target: string): boolean => norm(k).endsWith(norm(target));

const isMediaImageRef = (ref?: Reference): ref is MediaImageRef =>
  !!ref && (ref as { __typename?: string }).__typename === "MediaImage";

const isProductRef = (ref?: Reference): ref is ProductRef =>
  !!ref && (ref as { __typename?: string }).__typename === "Product";

export function mapStyledByYou(
  edges: MetaobjectEdge[],
  productId?: string
): UGCItem[] {
  if (!Array.isArray(edges)) return [];

  return edges
    .map((edge): UGCItem | null => {
      const node = edge.node;

      const pick = (t: string): MetaobjectField | undefined =>
        node.fields.find((f) => match(f.key, t));

      const imgRef = pick("image")?.reference;
      if (!isMediaImageRef(imgRef)) return null;

      const approved = (pick("approved")?.value ?? "true") === "true";
      if (!approved) return null;

      const productRef = pick("product")?.reference;
      const okForProduct =
        !productRef || !productId || (isProductRef(productRef) && productRef.id === productId);
      if (!okForProduct) return null;

      const image = imgRef.image;

      return {
        id: node.id,
        image,
        alt: pick("alt")?.value || image.altText || "",
        credit: pick("credit")?.value ?? undefined,
        url: pick("url")?.value ?? undefined,
        linkText: pick("link_text")?.value ?? undefined,
      };
    })
    .filter((x): x is UGCItem => x !== null);
}
