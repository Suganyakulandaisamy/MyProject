import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", default: null }
  },
  { timestamps: true }
);

subjectSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.faculty_id = ret.facultyId ? ret.facultyId.toString() : null;
    delete ret._id;
    delete ret.__v;
    delete ret.facultyId;
    return ret;
  }
});

export default mongoose.model("Subject", subjectSchema);
