import mongoose, { Schema, Document, Model } from "mongoose";
import { getModelProxy } from "@/lib/db";

interface IEditor {
  userId: string;
  email: string;
  name: string;
}

/**
 * Admin-editable storefront content, one document per key (e.g. "landing").
 * `draft` is what the editor works on; `published` is what visitors see.
 */
export interface ISiteContent extends Document {
  key: string;
  draft: unknown;
  published: unknown;
  draftUpdatedAt?: Date;
  draftUpdatedBy?: IEditor;
  publishedAt?: Date;
  publishedBy?: IEditor;
  createdAt: Date;
  updatedAt: Date;
}

const EditorSchema = new Schema<IEditor>(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const SiteContentSchema = new Schema<ISiteContent>(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    draft: { type: Schema.Types.Mixed },
    published: { type: Schema.Types.Mixed },
    draftUpdatedAt: { type: Date },
    draftUpdatedBy: { type: EditorSchema },
    publishedAt: { type: Date },
    publishedBy: { type: EditorSchema },
  },
  { timestamps: true, minimize: false }
);

const SiteContentModel: Model<ISiteContent> =
  mongoose.models.SiteContent || mongoose.model<ISiteContent>("SiteContent", SiteContentSchema);

export const SiteContent = getModelProxy(SiteContentModel, "SiteContent");

export default SiteContent;
