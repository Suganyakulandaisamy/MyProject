import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    academic_year: { type: String, required: true, trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    pass_percentage: { type: Number, required: true },
    quality_status: {
      type: String,
      enum: ["Good", "Need Improvement", "Pending Evaluation"],
      required: true
    }
  },
  { timestamps: true }
);

facultySchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.user_id = ret.userId ? ret.userId.toString() : null;
    ret.subject_id = ret.subjectId ? ret.subjectId.toString() : null;
    ret.avg_rating = ret.avg_rating ?? null;
    delete ret._id;
    delete ret.__v;
    delete ret.userId;
    return ret;
  }
});

export default mongoose.model("Faculty", facultySchema);
