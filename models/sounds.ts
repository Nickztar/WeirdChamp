import mongoose, { Document, Model } from "mongoose";

const soundSchema = new mongoose.Schema<SoundType, SoundModel>(
    {
        DisplayName: { type: String, required: false },
        key: { type: String, required: true },
        CreatedBy: { type: String, required: true },
        Size: { type: Number, required: true },
        LastModified: { type: Date, required: false },
        NameHash: { type: String },
    },
    { timestamps: true }
);

export default mongoose.models.Sounds || mongoose.model(`Sounds`, soundSchema);

export interface SoundType extends Document {
    DisplayName: string;
    key: string;
    CreatedBy: string;
    Size: number;
    LastModified?: Date | number;
    NameHash: string;
}

type SoundModel = Model<SoundType>;
